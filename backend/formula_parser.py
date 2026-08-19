"""Parser sandbox de fórmulas Excel-like (sem eval/exec, sem libs externas).

Lista branca de funções: SUM, AVERAGE, IF, CONCAT, DATE, SUMIF, COUNTIF, MIN, MAX.
Operadores: + - * / = > < >= <= &

Nota sobre funções agregadas (SUM/AVERAGE/MIN/MAX/SUMIF/COUNTIF): nesta v4.2 elas
operam linha a linha quando recebem uma coluna como argumento (ex.: SUM(quantidade)
retorna o valor da coluna na linha atual). A agregação real do dataset é feita pelo
agregador.py baseado na config do widget.
"""

from dataclasses import dataclass

FUNCOES_PERMITIDAS = {"SUM", "AVERAGE", "IF", "CONCAT", "DATE", "SUMIF", "COUNTIF", "MIN", "MAX"}
MAX_PROFUNDIDADE = 10
MAX_TAMANHO = 500


class FormulaError(Exception):
    pass


# ------------------------------------------------------------------- tokens

@dataclass
class Token:
    type: str
    value: object
    pos: int


def tokenize(formula: str) -> list[Token]:
    if len(formula) > MAX_TAMANHO:
        raise FormulaError(f"Fórmula excede o limite de {MAX_TAMANHO} caracteres.")
    tokens = []
    i = 0
    n = len(formula)
    while i < n:
        c = formula[i]
        if c.isspace():
            i += 1
            continue
        if c == "(":
            tokens.append(Token("LPAREN", c, i))
            i += 1
            continue
        if c == ")":
            tokens.append(Token("RPAREN", c, i))
            i += 1
            continue
        if c == ",":
            tokens.append(Token("COMMA", c, i))
            i += 1
            continue
        dois = formula[i:i + 2]
        if dois in (">=", "<=", "<>"):
            tokens.append(Token("OP", dois, i))
            i += 2
            continue
        if c in "+-*/=><&":
            tokens.append(Token("OP", c, i))
            i += 1
            continue
        if c in "\"'":
            quote = c
            j = i + 1
            buf = []
            while j < n and formula[j] != quote:
                buf.append(formula[j])
                j += 1
            if j >= n:
                raise FormulaError(f"String não fechada na posição {i}.")
            tokens.append(Token("STRING", "".join(buf), i))
            i = j + 1
            continue
        if c.isdigit() or (c == "." and i + 1 < n and formula[i + 1].isdigit()):
            j = i
            while j < n and (formula[j].isdigit() or formula[j] == "."):
                j += 1
            texto = formula[i:j]
            if texto.count(".") > 1:
                raise FormulaError(f"Número inválido '{texto}' na posição {i}.")
            tokens.append(Token("NUMBER", float(texto), i))
            i = j
            continue
        if c.isalpha() or c == "_":
            j = i
            while j < n and (formula[j].isalnum() or formula[j] == "_"):
                j += 1
            tokens.append(Token("IDENT", formula[i:j], i))
            i = j
            continue
        raise FormulaError(f"Caractere inválido '{c}' na posição {i}.")
    tokens.append(Token("EOF", None, n))
    return tokens


# ---------------------------------------------------------------------- AST

@dataclass
class NumNode:
    value: float


@dataclass
class StrNode:
    value: str


@dataclass
class IdentNode:
    name: str


@dataclass
class FuncNode:
    name: str
    args: list


@dataclass
class OpNode:
    op: str
    left: object
    right: object


@dataclass
class UnaryNode:
    op: str
    operand: object


# ------------------------------------------------------------------- parser

class _Parser:
    def __init__(self, tokens: list[Token], colunas_validas: list[str]):
        self.tokens = tokens
        self.pos = 0
        self.colunas_validas = set(colunas_validas)
        self.profundidade = 0

    def _peek(self) -> Token:
        return self.tokens[self.pos]

    def _avancar(self) -> Token:
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok

    def _esperar(self, tipo: str) -> Token:
        tok = self._peek()
        if tok.type != tipo:
            raise FormulaError(f"Esperava {tipo}, encontrou '{tok.value}' na posição {tok.pos}.")
        return self._avancar()

    def parse(self):
        ast = self._expr()
        if self._peek().type != "EOF":
            raise FormulaError(f"Token inesperado '{self._peek().value}' na posição {self._peek().pos}.")
        return ast

    def _expr(self):
        return self._comparison()

    def _comparison(self):
        left = self._concat()
        tok = self._peek()
        if tok.type == "OP" and tok.value in ("=", "<>", ">", "<", ">=", "<="):
            self._avancar()
            right = self._concat()
            return OpNode(tok.value, left, right)
        return left

    def _concat(self):
        left = self._add()
        while self._peek().type == "OP" and self._peek().value == "&":
            self._avancar()
            right = self._add()
            left = OpNode("&", left, right)
        return left

    def _add(self):
        left = self._mul()
        while self._peek().type == "OP" and self._peek().value in ("+", "-"):
            op = self._avancar().value
            right = self._mul()
            left = OpNode(op, left, right)
        return left

    def _mul(self):
        left = self._unary()
        while self._peek().type == "OP" and self._peek().value in ("*", "/"):
            op = self._avancar().value
            right = self._unary()
            left = OpNode(op, left, right)
        return left

    def _unary(self):
        if self._peek().type == "OP" and self._peek().value == "-":
            self._avancar()
            return UnaryNode("-", self._unary())
        return self._primary()

    def _primary(self):
        self.profundidade += 1
        if self.profundidade > MAX_PROFUNDIDADE:
            raise FormulaError(f"Profundidade máxima de {MAX_PROFUNDIDADE} excedida.")
        try:
            tok = self._peek()
            if tok.type == "NUMBER":
                self._avancar()
                return NumNode(tok.value)
            if tok.type == "STRING":
                self._avancar()
                return StrNode(tok.value)
            if tok.type == "LPAREN":
                self._avancar()
                node = self._expr()
                self._esperar("RPAREN")
                return node
            if tok.type == "IDENT":
                self._avancar()
                nome = tok.value
                if self._peek().type == "LPAREN":
                    if nome.upper() not in FUNCOES_PERMITIDAS:
                        raise FormulaError(f"Função '{nome}' não permitida.")
                    self._avancar()  # LPAREN
                    args = []
                    if self._peek().type != "RPAREN":
                        args.append(self._expr())
                        while self._peek().type == "COMMA":
                            self._avancar()
                            args.append(self._expr())
                    self._esperar("RPAREN")
                    return FuncNode(nome.upper(), args)
                if nome not in self.colunas_validas:
                    raise FormulaError(f"Coluna '{nome}' não existe no dataset.")
                return IdentNode(nome)
            raise FormulaError(f"Token inesperado '{tok.value}' na posição {tok.pos}.")
        finally:
            self.profundidade -= 1


def parse(tokens: list[Token], colunas_validas: list[str]):
    """Constrói a AST a partir dos tokens, validando colunas/funções/profundidade."""
    return _Parser(tokens, colunas_validas).parse()


# ---------------------------------------------------------------- avaliador

def _para_numero(valor):
    if isinstance(valor, bool):
        return None
    if isinstance(valor, (int, float)):
        return float(valor)
    try:
        return float(valor)
    except (TypeError, ValueError):
        return None


def _para_booleano(valor) -> bool:
    if isinstance(valor, bool):
        return valor
    if isinstance(valor, (int, float)):
        return valor != 0
    if isinstance(valor, str):
        return valor.strip().lower() in ("true", "1", "sim", "yes")
    return bool(valor)


def _comparar(op: str, a, b) -> bool:
    try:
        if op == "=":
            return a == b
        if op == "<>":
            return a != b
        na, nb = _para_numero(a), _para_numero(b)
        if na is not None and nb is not None:
            if op == ">":
                return na > nb
            if op == "<":
                return na < nb
            if op == ">=":
                return na >= nb
            if op == "<=":
                return na <= nb
        sa, sb = str(a), str(b)
        if op == ">":
            return sa > sb
        if op == "<":
            return sa < sb
        if op == ">=":
            return sa >= sb
        if op == "<=":
            return sa <= sb
    except Exception:
        return False
    return False


def _soma(args, linha):
    total = 0.0
    for a in args:
        v = _para_numero(evaluate(a, linha))
        if v is not None:
            total += v
    return total


def _media(args, linha):
    valores = []
    for a in args:
        v = _para_numero(evaluate(a, linha))
        if v is not None:
            valores.append(v)
    if not valores:
        return 0.0
    return sum(valores) / len(valores)


def _min(args, linha):
    valores = []
    for a in args:
        v = _para_numero(evaluate(a, linha))
        if v is not None:
            valores.append(v)
    return min(valores) if valores else 0.0


def _max(args, linha):
    valores = []
    for a in args:
        v = _para_numero(evaluate(a, linha))
        if v is not None:
            valores.append(v)
    return max(valores) if valores else 0.0


def _sumif(args, linha):
    if len(args) < 2:
        raise FormulaError("SUMIF requer ao menos 2 argumentos.")
    range_col = _nome_coluna(args[0])
    criteria = evaluate(args[1], linha)
    sum_col = _nome_coluna(args[2]) if len(args) > 2 else range_col
    if range_col is None:
        raise FormulaError("SUMIF requer uma coluna como primeiro argumento.")
    total = 0.0
    for chave, valor in linha.items():
        if chave == range_col:
            if str(valor) == str(criteria):
                v = _para_numero(linha.get(sum_col))
                if v is not None:
                    total += v
    return total


def _countif(args, linha):
    if len(args) < 2:
        raise FormulaError("COUNTIF requer 2 argumentos.")
    range_col = _nome_coluna(args[0])
    criteria = evaluate(args[1], linha)
    if range_col is None:
        raise FormulaError("COUNTIF requer uma coluna como primeiro argumento.")
    contagem = 0
    for chave, valor in linha.items():
        if chave == range_col and str(valor) == str(criteria):
            contagem += 1
    return float(contagem)


def _nome_coluna(node):
    if isinstance(node, IdentNode):
        return node.name
    return None


def _executar_funcao(nome: str, args: list, linha: dict):
    if nome == "SUM":
        return _soma(args, linha)
    if nome == "AVERAGE":
        return _media(args, linha)
    if nome == "MIN":
        return _min(args, linha)
    if nome == "MAX":
        return _max(args, linha)
    if nome == "IF":
        if len(args) != 3:
            raise FormulaError("IF requer 3 argumentos.")
        cond = _para_booleano(evaluate(args[0], linha))
        return evaluate(args[1], linha) if cond else evaluate(args[2], linha)
    if nome == "CONCAT":
        return "".join(str(evaluate(a, linha) or "") for a in args)
    if nome == "DATE":
        if len(args) != 3:
            raise FormulaError("DATE requer 3 argumentos.")
        y = int(_para_numero(evaluate(args[0], linha)) or 0)
        m = int(_para_numero(evaluate(args[1], linha)) or 0)
        d = int(_para_numero(evaluate(args[2], linha)) or 0)
        return f"{y:04d}-{m:02d}-{d:02d}"
    if nome == "SUMIF":
        return _sumif(args, linha)
    if nome == "COUNTIF":
        return _countif(args, linha)
    raise FormulaError(f"Função '{nome}' não permitida.")


def evaluate(ast, linha: dict):
    """Avalia a AST contra uma linha (dict de colunas)."""
    if isinstance(ast, NumNode):
        return ast.value
    if isinstance(ast, StrNode):
        return ast.value
    if isinstance(ast, IdentNode):
        return linha.get(ast.name)
    if isinstance(ast, UnaryNode):
        v = evaluate(ast.operand, linha)
        if ast.op == "-":
            num = _para_numero(v)
            return -num if num is not None else None
        return v
    if isinstance(ast, OpNode):
        if ast.op == "&":
            return str(evaluate(ast.left, linha) or "") + str(evaluate(ast.right, linha) or "")
        left = evaluate(ast.left, linha)
        right = evaluate(ast.right, linha)
        if ast.op in ("=", "<>", ">", "<", ">=", "<="):
            return _comparar(ast.op, left, right)
        nl = _para_numero(left)
        nr = _para_numero(right)
        if nl is None or nr is None:
            return None
        if ast.op == "+":
            return nl + nr
        if ast.op == "-":
            return nl - nr
        if ast.op == "*":
            return nl * nr
        if ast.op == "/":
            if nr == 0:
                return None  # divisão por zero
            return nl / nr
        return None
    if isinstance(ast, FuncNode):
        return _executar_funcao(ast.name, ast.args, linha)
    return None


def validar_formula(formula: str, colunas_validas: list[str]) -> tuple[bool, str]:
    """Valida uma fórmula. Retorna (ok, mensagem_erro)."""
    try:
        tokens = tokenize(formula)
        parse(tokens, colunas_validas)
        return True, ""
    except FormulaError as erro:
        return False, str(erro)
