import pytest

import formula_parser
from formula_parser import FormulaError, evaluate, parse, tokenize

COLUNAS = ["quantidade", "custo_unitario", "material", "cod", "tipo", "valor", "preco"]


def _avaliar(formula, linha):
    tokens = tokenize(formula)
    ast = parse(tokens, COLUNAS)
    return evaluate(ast, linha)


def _rejeitar(formula):
    with pytest.raises(FormulaError):
        tokens = tokenize(formula)
        parse(tokens, COLUNAS)


# ------------------------------------------------------------- casos legítimos

def test_multiplicacao_colunas():
    assert _avaliar("quantidade * custo_unitario", {"quantidade": 3, "custo_unitario": 10}) == 30


def test_soma_coluna_linha():
    assert _avaliar("SUM(quantidade)", {"quantidade": 5}) == 5


def test_media():
    assert _avaliar("AVERAGE(quantidade, custo_unitario)", {"quantidade": 4, "custo_unitario": 8}) == 6


def test_min():
    assert _avaliar("MIN(quantidade, custo_unitario)", {"quantidade": 4, "custo_unitario": 8}) == 4


def test_max():
    assert _avaliar("MAX(quantidade, custo_unitario)", {"quantidade": 4, "custo_unitario": 8}) == 8


def test_if_verdadeiro():
    assert _avaliar("IF(quantidade > 0, custo_unitario, 0)", {"quantidade": 5, "custo_unitario": 10}) == 10


def test_if_falso():
    assert _avaliar("IF(quantidade > 0, custo_unitario, 0)", {"quantidade": 0, "custo_unitario": 10}) == 0


def test_concat():
    assert _avaliar('CONCAT(material, "-", cod)', {"material": "Cabo", "cod": "A1"}) == "Cabo-A1"


def test_date():
    assert _avaliar("DATE(2026, 1, 5)", {}) == "2026-01-05"


def test_sumif():
    assert _avaliar('SUMIF(tipo, "A", valor)', {"tipo": "A", "valor": 10}) == 10


def test_countif():
    assert _avaliar('COUNTIF(tipo, "A")', {"tipo": "A"}) == 1


def test_parenteses_aninhados():
    assert _avaliar("(quantidade + custo_unitario) * 2", {"quantidade": 3, "custo_unitario": 7}) == 20


def test_string_aspas_simples():
    assert _avaliar("CONCAT('a', 'b')", {}) == "ab"


def test_string_aspas_duplas():
    assert _avaliar('CONCAT("a", "b")', {}) == "ab"


def test_operadores_comparacao():
    assert _avaliar("quantidade >= 3", {"quantidade": 5}) is True
    assert _avaliar("quantidade < 3", {"quantidade": 5}) is False


def test_divisao():
    assert _avaliar("quantidade / 2", {"quantidade": 10}) == 5


def test_unario_negativo():
    assert _avaliar("-quantidade", {"quantidade": 5}) == -5


# ------------------------------------------------------------- casos maliciosos

def test_rejeita_import():
    _rejeitar("__import__('os').system('rm -rf /')")


def test_rejeita_drop_table():
    _rejeitar(";DROP TABLE datasets")


def test_rejeita_eval():
    _rejeitar('eval("malicious")')


def test_rejeita_lista():
    _rejeitar("[1, 2, 3]")


def test_rejeita_dict():
    _rejeitar("{key: value}")


def test_rejeita_funcao_desconhecida():
    _rejeitar("EVIL(col)")


def test_rejeita_identificador_fora_lista():
    _rejeitar("outra_coluna")


def test_rejeita_profundidade():
    _rejeitar("((((((((((((x))))))))))))")


def test_rejeita_tamanho():
    _rejeitar("quantidade + " + "1" * 501)


def test_rejeita_atributo():
    _rejeitar("coluna.attr")


def test_rejeita_numero_invalido():
    _rejeitar("1.2.3")


def test_rejeita_expressao_incompleta():
    _rejeitar("quantidade +")


def test_rejeita_parentese_nao_fechado():
    _rejeitar("SUM(")


def test_rejeita_string_nao_fechada():
    _rejeitar('"unclosed')


def test_rejeita_operador_sozinho():
    _rejeitar("quantidade &")


def test_validar_formula_retorna_false():
    ok, msg = formula_parser.validar_formula("EVIL(col)", COLUNAS)
    assert ok is False
    assert "EVIL" in msg


def test_validar_formula_retorna_true():
    ok, msg = formula_parser.validar_formula("quantidade * custo_unitario", COLUNAS)
    assert ok is True
    assert msg == ""
