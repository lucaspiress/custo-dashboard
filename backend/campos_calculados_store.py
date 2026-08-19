"""Acesso a dados de campos calculados (Neon via psycopg ou SQLite local).

Segue o mesmo padrão de datasets_store.py: a ramificação é feita por database_url().
A tabela é criada no boot (schema.sql no Neon, history._inicializar no SQLite).
"""

import json
from datetime import datetime

import db
import datasets_store
import formula_parser
import history


def _sqlite(db_url=None) -> bool:
    if db_url is not None:
        return not bool(db_url)
    return not db.enabled()


def _conn(db_url=None):
    if _sqlite(db_url):
        return history._conexao()
    return db.connect()


def _normalizar_json(valor):
    if isinstance(valor, str):
        try:
            return json.loads(valor)
        except (TypeError, ValueError):
            return []
    return valor or []


def obter_colunas_dataset(dataset_id: int, db_url=None) -> list[str]:
    """Retorna as colunas válidas de um dataset (schema_json.colunas ou das linhas)."""
    dataset = datasets_store.obter_dataset_por_id(dataset_id, db_url=db_url)
    colunas = []
    if dataset:
        schema = dataset.get("schema_json") or {}
        if isinstance(schema, dict) and isinstance(schema.get("colunas"), list):
            colunas = [str(c) for c in schema["colunas"]]
    if colunas:
        return colunas
    # deduzir das primeiras linhas
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            linhas_raw = conn.execute(
                "select data_json from dataset_rows where dataset_id = ? order by row_index limit 50",
                (int(dataset_id),),
            ).fetchall()
        else:
            linhas_raw = conn.execute(
                "select data_json from public.dataset_rows where dataset_id = %s order by row_index limit 50",
                (int(dataset_id),),
            ).fetchall()
        vistos = set()
        for r in linhas_raw:
            dados = _normalizar_json(r["data_json"])
            for chave in dados:
                if chave not in vistos:
                    vistos.add(chave)
                    colunas.append(chave)
        return colunas
    finally:
        conn.close()


def _extrair_dependencias(ast) -> list[str]:
    """Coleta os nomes de colunas (IdentNode) referenciados na AST."""
    dependencias = []
    vistos = set()

    def _percorrer(node):
        if isinstance(node, formula_parser.IdentNode):
            if node.name not in vistos:
                vistos.add(node.name)
                dependencias.append(node.name)
        elif isinstance(node, formula_parser.FuncNode):
            for a in node.args:
                _percorrer(a)
        elif isinstance(node, formula_parser.OpNode):
            _percorrer(node.left)
            _percorrer(node.right)
        elif isinstance(node, formula_parser.UnaryNode):
            _percorrer(node.operand)

    _percorrer(ast)
    return dependencias


def _validar_e_parse(formula: str, colunas: list[str]):
    tokens = formula_parser.tokenize(formula)
    ast = formula_parser.parse(tokens, colunas)
    return ast


def listar(did, projeto_id=None, db_url=None) -> list[dict]:
    if datasets_store.eh_virtual(did):
        raise ValueError("Campos calculados só em datasets livres.")
    did_int = int(did)
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            linhas = conn.execute(
                "select id, dataset_id, nome, formula, dependencias_json, ordem "
                "from campos_calculados where dataset_id = ? order by ordem, id",
                (did_int,),
            ).fetchall()
            campos = [dict(linha) for linha in linhas]
        else:
            campos = list(
                conn.execute(
                    "select id, dataset_id, nome, formula, dependencias_json, ordem "
                    "from public.campos_calculados where dataset_id = %s order by ordem, id",
                    (did_int,),
                ).fetchall()
            )
        for c in campos:
            c["dependencias_json"] = _normalizar_json(c["dependencias_json"])
        return campos
    finally:
        conn.close()


def obter(cid: int, db_url=None) -> dict | None:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            linha = conn.execute(
                "select id, dataset_id, nome, formula, dependencias_json, ordem "
                "from campos_calculados where id = ?",
                (cid,),
            ).fetchone()
            campo = dict(linha) if linha else None
        else:
            campo = conn.execute(
                "select id, dataset_id, nome, formula, dependencias_json, ordem "
                "from public.campos_calculados where id = %s",
                (cid,),
            ).fetchone()
        if campo:
            campo["dependencias_json"] = _normalizar_json(campo["dependencias_json"])
        return campo
    finally:
        conn.close()


def criar(did, projeto_id, nome, formula, ordem=0, db_url=None) -> dict:
    if datasets_store.eh_virtual(did):
        raise ValueError("Campos calculados só em datasets livres.")
    did_int = int(did)
    nome = str(nome or "").strip()
    formula = str(formula or "").strip()
    if not nome:
        raise ValueError("Informe o nome do campo calculado.")
    if not formula:
        raise ValueError("Informe a fórmula do campo calculado.")
    dataset = datasets_store.obter_dataset(did_int, projeto_id, db_url=db_url)
    if dataset is None:
        raise ValueError("Dataset não encontrado.")
    colunas = obter_colunas_dataset(did_int, db_url=db_url)
    ast = _validar_e_parse(formula, colunas)  # levanta FormulaError se inválida
    dependencias = _extrair_dependencias(ast)
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            cursor = conn.execute(
                "insert into campos_calculados (dataset_id, nome, formula, dependencias_json, ordem) "
                "values (?, ?, ?, ?, ?)",
                (did_int, nome, formula, json.dumps(dependencias, ensure_ascii=False), int(ordem)),
            )
            conn.commit()
            cid = int(cursor.lastrowid)  # type: ignore[return-value]
        else:
            linha = conn.execute(
                "insert into public.campos_calculados (dataset_id, nome, formula, dependencias_json, ordem) "
                "values (%s, %s, %s, %s, %s) returning id",
                (did_int, nome, formula, dependencias, int(ordem)),
            ).fetchone()
            conn.commit()
            cid = int(linha["id"])
        return obter(cid, db_url=db_url)
    finally:
        conn.close()


def atualizar(cid: int, *, nome=None, formula=None, ordem=None, db_url=None) -> dict | None:
    atual = obter(cid, db_url=db_url)
    if atual is None:
        return None
    novo_nome = str(nome).strip() if nome is not None and str(nome).strip() else atual["nome"]
    novo_formula = str(formula).strip() if formula is not None and str(formula).strip() else atual["formula"]
    novo_ordem = atual["ordem"] if ordem is None else int(ordem)
    dependencias = atual["dependencias_json"]
    if formula is not None and str(formula).strip():
        colunas = obter_colunas_dataset(int(atual["dataset_id"]), db_url=db_url)
        ast = _validar_e_parse(novo_formula, colunas)  # re-valida se formula mudar
        dependencias = _extrair_dependencias(ast)
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            conn.execute(
                "update campos_calculados set nome = ?, formula = ?, dependencias_json = ?, ordem = ? where id = ?",
                (novo_nome, novo_formula, json.dumps(dependencias, ensure_ascii=False), novo_ordem, cid),
            )
            conn.commit()
        else:
            conn.execute(
                "update public.campos_calculados set nome = %s, formula = %s, dependencias_json = %s, ordem = %s "
                "where id = %s",
                (novo_nome, novo_formula, dependencias, novo_ordem, cid),
            )
            conn.commit()
        return obter(cid, db_url=db_url)
    finally:
        conn.close()


def deletar(cid: int, db_url=None) -> bool:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            cursor = conn.execute("delete from campos_calculados where id = ?", (cid,))
        else:
            cursor = conn.execute("delete from public.campos_calculados where id = %s", (cid,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()
