"""Agregação de dados para widgets de dashboard (sem pandas).

Suporta datasets virtuais (locais-{pid}/itens-{pid}) consultando as tabelas reais,
e datasets numéricos consultando dataset_rows.data_json. Agregação em Python puro
(listas/dicts) — suficiente para o volume esperado e correto nos dois bancos.
"""

import json

import campos_calculados_store
import db
import datasets_store
import formula_parser
import history

AGRECACOES_VALIDAS = ("sum", "avg", "count", "min", "max")


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
            return {}
    return valor or {}


def _to_float(valor):
    if valor is None or isinstance(valor, bool):
        return None
    try:
        return float(valor)
    except (TypeError, ValueError):
        return None


def _carregar_virtual(fonte: str, pid: int, db_url=None):
    conn = _conn(db_url)
    try:
        if fonte == "locais":
            colunas = [c["campo"] for c in datasets_store.SCHEMA_LOCAIS]
            if _sqlite(db_url):
                linhas = [dict(r) for r in conn.execute(
                    "select " + ", ".join(colunas) + " from locais where projeto_id = ? order by id",
                    (pid,),
                ).fetchall()]
            else:
                linhas = list(conn.execute(
                    "select " + ", ".join(colunas) + " from public.locais where projeto_id = %s order by id",
                    (pid,),
                ).fetchall())
        else:
            colunas = [c["campo"] for c in datasets_store.SCHEMA_ITENS]
            if _sqlite(db_url):
                linhas = [dict(r) for r in conn.execute(
                    "select " + ", ".join(colunas) + " from itens "
                    "where local_id in (select id from locais where projeto_id = ?) order by id",
                    (pid,),
                ).fetchall()]
            else:
                linhas = list(conn.execute(
                    "select " + ", ".join(colunas) + " from public.itens "
                    "where local_id in (select id from public.locais where projeto_id = %s) order by id",
                    (pid,),
                ).fetchall())
        return linhas, colunas
    finally:
        conn.close()


def _carregar_dataset(dataset_id, db_url=None):
    dataset = datasets_store.obter_dataset_por_id(dataset_id, db_url=db_url)
    colunas = []
    if dataset:
        schema = dataset.get("schema_json") or {}
        if isinstance(schema, dict) and isinstance(schema.get("colunas"), list):
            colunas = [str(c) for c in schema["colunas"]]
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            linhas_raw = conn.execute(
                "select data_json from dataset_rows where dataset_id = ? order by row_index",
                (int(dataset_id),),
            ).fetchall()
        else:
            linhas_raw = conn.execute(
                "select data_json from public.dataset_rows where dataset_id = %s order by row_index",
                (int(dataset_id),),
            ).fetchall()
        linhas = []
        vistos = set(colunas)
        for r in linhas_raw:
            dados = _normalizar_json(r["data_json"])
            linhas.append(dados)
            for chave in dados:
                if chave not in vistos:
                    vistos.add(chave)
                    colunas.append(chave)
        return linhas, colunas
    finally:
        conn.close()


def _carregar_linhas(dataset_id, db_url=None):
    virtual = datasets_store.id_virtual(dataset_id)
    if virtual:
        fonte, pid = virtual
        return _carregar_virtual(fonte, pid, db_url)
    return _carregar_dataset(dataset_id, db_url)


def aplicar_campos_calculados(did, linhas, db_url=None) -> list[dict]:
    """Avalia os campos calculados do dataset e adiciona os resultados em cada linha.

    Se uma fórmula falhar numa linha (campo ausente, divisão por zero), o valor
    daquele campo naquela linha é None; as demais linhas continuam normalmente.
    """
    try:
        campos = campos_calculados_store.listar(did, db_url=db_url)
    except (ValueError, Exception):
        return linhas
    if not campos:
        return linhas
    colunas = campos_calculados_store.obter_colunas_dataset(int(did), db_url=db_url)
    preparados = []
    for campo in campos:
        try:
            tokens = formula_parser.tokenize(campo["formula"])
            ast = formula_parser.parse(tokens, colunas)
            preparados.append((campo["nome"], ast))
        except formula_parser.FormulaError:
            continue
    if not preparados:
        return linhas
    for linha in linhas:
        for nome, ast in preparados:
            try:
                linha[nome] = formula_parser.evaluate(ast, linha)
            except Exception:
                linha[nome] = None
    return linhas


def _aplicar_filtros(linhas, filters, slicers):
    resultado = linhas
    for campo, valor in (filters or {}).items():
        resultado = [l for l in resultado if str(l.get(campo, "")) == str(valor)]
    for slicer in (slicers or []):
        campo = slicer.get("field")
        valores = slicer.get("values")
        if valores is not None:
            valores_set = {str(v) for v in valores}
            resultado = [l for l in resultado if str(l.get(campo, "")) in valores_set]
        else:
            minimo = slicer.get("min")
            maximo = slicer.get("max")
            if minimo is not None:
                resultado = [l for l in resultado
                             if _to_float(l.get(campo)) is not None and _to_float(l.get(campo)) >= float(minimo)]
            if maximo is not None:
                resultado = [l for l in resultado
                             if _to_float(l.get(campo)) is not None and _to_float(l.get(campo)) <= float(maximo)]
    return resultado


def _agregar_valores(linhas, field, aggregation):
    if aggregation == "count":
        return float(len(linhas))
    valores = []
    for linha in linhas:
        v = _to_float(linha.get(field))
        if v is not None:
            valores.append(v)
    if not valores:
        return 0.0
    if aggregation == "sum":
        return round(sum(valores), 2)
    if aggregation == "avg":
        return round(sum(valores) / len(valores), 2)
    if aggregation == "min":
        return round(min(valores), 2)
    if aggregation == "max":
        return round(max(valores), 2)
    return 0.0


def agregar(dataset_id, group_by=None, aggregation="sum", field=None, filters=None, slicers=None, db_url=None) -> dict:
    """Retorna {groups: [{key, value}], total, rows} para um dataset."""
    if aggregation not in (None, "none", *AGRECACOES_VALIDAS):
        raise ValueError("Agregação inválida. Use sum, avg, count, min ou max.")
    if isinstance(group_by, str):
        group_by = [group_by]
    group_by = group_by or []
    filters = filters or {}
    slicers = slicers or []

    linhas, colunas = _carregar_linhas(dataset_id, db_url)

    # inclui campos calculados como colunas virtuais (apenas datasets numéricos)
    if not datasets_store.eh_virtual(dataset_id):
        linhas = aplicar_campos_calculados(dataset_id, linhas, db_url)
        try:
            for campo in campos_calculados_store.listar(dataset_id, db_url=db_url):
                if campo["nome"] not in colunas:
                    colunas.append(campo["nome"])
        except ValueError:
            pass

    if field is not None and field not in colunas:
        raise ValueError(f"Campo '{field}' não existe no dataset.")
    for g in group_by:
        if g not in colunas:
            raise ValueError(f"Campo '{g}' não existe no dataset.")

    linhas = _aplicar_filtros(linhas, filters, slicers)

    if aggregation in (None, "none"):
        return {"groups": [], "total": float(len(linhas)), "rows": linhas}

    if not group_by:
        valor = _agregar_valores(linhas, field, aggregation)
        return {"groups": [], "total": valor, "rows": []}

    grupos = {}
    for linha in linhas:
        chave = tuple(str(linha.get(g, "")) for g in group_by)
        grupos.setdefault(chave, []).append(linha)

    result_groups = []
    for chave, grupo in grupos.items():
        key = {g: grupo[0].get(g) for g in group_by}
        value = _agregar_valores(grupo, field, aggregation)
        result_groups.append({"key": key, "value": value})
    result_groups.sort(key=lambda r: str(r["key"]))

    total = _agregar_valores(linhas, field, aggregation)
    return {"groups": result_groups, "total": total, "rows": []}


def listar_opcoes_slicer(dataset_id, field, db_url=None) -> list:
    """Retorna valores únicos de um campo (para dropdowns de slicers). Máx 100."""
    linhas, colunas = _carregar_linhas(dataset_id, db_url)
    if field not in colunas:
        raise ValueError(f"Campo '{field}' não existe no dataset.")
    valores = []
    vistos = set()
    for linha in linhas:
        v = linha.get(field)
        if v is None or str(v).strip() == "":
            continue
        chave = str(v)
        if chave not in vistos:
            vistos.add(chave)
            valores.append(v)
        if len(valores) >= 100:
            break
    return valores
