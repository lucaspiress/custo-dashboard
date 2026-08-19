"""Acesso a dados de datasets e linhas (Neon via psycopg ou SQLite local).

Segue o mesmo padrão de projetos_store.py: a ramificação é feita por database_url().
As tabelas são criadas no boot (schema.sql no Neon, history._inicializar no SQLite).

Os datasets virtuais (locais-{projeto_id} e itens-{projeto_id}) não têm registro na
tabela `datasets`; são resolvidos consultando as tabelas reais `locais`/`itens`.
"""

import json
from datetime import datetime

import db
import history

LIMITE_DATASETS = 20
LIMITE_LINHAS = 100_000

COLS_LOCAIS = (
    "id, projeto_id, nome, valor_mensal, taxa_instalacao, custo_manutencao, "
    "mensal_terceirizada, chip_mensal, custos_softwares, mao_de_obra, data_inst"
)
COLS_ITENS = "id, local_id, categoria, cod, material, qtd, valor_unit, valor_total"

SCHEMA_LOCAIS = [
    {"campo": "id", "tipo": "integer"},
    {"campo": "projeto_id", "tipo": "integer"},
    {"campo": "nome", "tipo": "text"},
    {"campo": "valor_mensal", "tipo": "number"},
    {"campo": "taxa_instalacao", "tipo": "number"},
    {"campo": "custo_manutencao", "tipo": "number"},
    {"campo": "mensal_terceirizada", "tipo": "number"},
    {"campo": "chip_mensal", "tipo": "number"},
    {"campo": "custos_softwares", "tipo": "number"},
    {"campo": "mao_de_obra", "tipo": "number"},
    {"campo": "data_inst", "tipo": "text"},
]

SCHEMA_ITENS = [
    {"campo": "id", "tipo": "integer"},
    {"campo": "local_id", "tipo": "integer"},
    {"campo": "categoria", "tipo": "text"},
    {"campo": "cod", "tipo": "text"},
    {"campo": "material", "tipo": "text"},
    {"campo": "qtd", "tipo": "number"},
    {"campo": "valor_unit", "tipo": "number"},
    {"campo": "valor_total", "tipo": "number"},
]


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


def id_virtual(did) -> tuple[str, int] | None:
    """Retorna (fonte, projeto_id) se `did` for um ID virtual (locais-*/itens-*)."""
    if isinstance(did, str):
        for prefixo in ("locais-", "itens-"):
            if did.startswith(prefixo):
                sufixo = did[len(prefixo):]
                if sufixo.isdigit():
                    return prefixo.rstrip("-"), int(sufixo)
    return None


def eh_virtual(did) -> bool:
    return id_virtual(did) is not None


def _virtual_dataset(fonte: str, projeto_id: int) -> dict:
    if fonte == "locais":
        return {
            "id": f"locais-{projeto_id}",
            "projeto_id": projeto_id,
            "nome": "Locais",
            "schema_json": SCHEMA_LOCAIS,
            "fonte": "locais",
            "criado_em": None,
            "atualizado_em": None,
        }
    return {
        "id": f"itens-{projeto_id}",
        "projeto_id": projeto_id,
        "nome": "Itens",
        "schema_json": SCHEMA_ITENS,
        "fonte": "itens",
        "criado_em": None,
        "atualizado_em": None,
    }


# ---------------------------------------------------------------- datasets

def listar_datasets(projeto_id: int, db_url=None) -> list[dict]:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            linhas = conn.execute(
                """select id, projeto_id, nome, schema_json, fonte, criado_em, atualizado_em
                   from datasets where projeto_id = ? order by id""",
                (projeto_id,),
            ).fetchall()
            datasets = [dict(linha) for linha in linhas]
        else:
            datasets = list(
                conn.execute(
                    """select id, projeto_id, nome, schema_json, fonte, criado_em, atualizado_em
                       from public.datasets where projeto_id = %s order by id""",
                    (projeto_id,),
                ).fetchall()
            )
        for dataset in datasets:
            dataset["schema_json"] = _normalizar_json(dataset["schema_json"])
        datasets.append(_virtual_dataset("locais", projeto_id))
        datasets.append(_virtual_dataset("itens", projeto_id))
        return datasets
    finally:
        conn.close()


def obter_dataset(did, projeto_id: int, db_url=None) -> dict | None:
    virtual = id_virtual(did)
    if virtual:
        fonte, pid = virtual
        if pid != projeto_id:
            return None
        return _virtual_dataset(fonte, pid)
    try:
        did_int = int(did)
    except (TypeError, ValueError):
        return None
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            linha = conn.execute(
                """select id, projeto_id, nome, schema_json, fonte, criado_em, atualizado_em
                   from datasets where id = ? and projeto_id = ?""",
                (did_int, projeto_id),
            ).fetchone()
            dataset = dict(linha) if linha else None
        else:
            dataset = conn.execute(
                """select id, projeto_id, nome, schema_json, fonte, criado_em, atualizado_em
                   from public.datasets where id = %s and projeto_id = %s""",
                (did_int, projeto_id),
            ).fetchone()
        if dataset:
            dataset["schema_json"] = _normalizar_json(dataset["schema_json"])
        return dataset
    finally:
        conn.close()


def obter_dataset_por_id(did, db_url=None) -> dict | None:
    """Busca dataset por id numérico, sem filtrar por projeto (usado nas rotas de linhas)."""
    if eh_virtual(did):
        return None
    try:
        did_int = int(did)
    except (TypeError, ValueError):
        return None
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            linha = conn.execute(
                """select id, projeto_id, nome, schema_json, fonte, criado_em, atualizado_em
                   from datasets where id = ?""",
                (did_int,),
            ).fetchone()
            dataset = dict(linha) if linha else None
        else:
            dataset = conn.execute(
                """select id, projeto_id, nome, schema_json, fonte, criado_em, atualizado_em
                   from public.datasets where id = %s""",
                (did_int,),
            ).fetchone()
        if dataset:
            dataset["schema_json"] = _normalizar_json(dataset["schema_json"])
        return dataset
    finally:
        conn.close()


def criar_dataset(projeto_id: int, nome: str, schema_json: dict | None = None, db_url=None) -> dict:
    nome = str(nome or "").strip()
    if not nome:
        raise ValueError("Informe o nome do dataset.")
    schema = schema_json or {}
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            total = conn.execute(
                "select count(*) from datasets where projeto_id = ?", (projeto_id,)
            ).fetchone()[0]
        else:
            total = conn.execute(
                "select count(*) from public.datasets where projeto_id = %s", (projeto_id,)
            ).fetchone()["count"]
        if int(total) >= LIMITE_DATASETS:
            raise ValueError(f"Limite de {LIMITE_DATASETS} datasets por projeto atingido.")
        agora = datetime.now().isoformat(timespec="seconds")
        if _sqlite(db_url):
            cursor = conn.execute(
                """insert into datasets (projeto_id, nome, schema_json, fonte, criado_em, atualizado_em)
                   values (?, ?, ?, 'livre', ?, ?)""",
                (projeto_id, nome, json.dumps(schema, ensure_ascii=False), agora, agora),
            )
            conn.commit()
            return {
                "id": int(cursor.lastrowid),  # type: ignore[return-value]
                "projeto_id": projeto_id,
                "nome": nome,
                "schema_json": schema,
                "fonte": "livre",
                "criado_em": agora,
                "atualizado_em": agora,
            }
        linha = conn.execute(
            """insert into public.datasets (projeto_id, nome, schema_json, fonte)
               values (%s, %s, %s, 'livre')
               returning id, projeto_id, nome, schema_json, fonte, criado_em, atualizado_em""",
            (projeto_id, nome, schema),
        ).fetchone()
        conn.commit()
        dataset = dict(linha)
        dataset["schema_json"] = _normalizar_json(dataset["schema_json"])
        return dataset
    finally:
        conn.close()


def atualizar_dataset(did, projeto_id: int, *, nome=None, schema_json=None, db_url=None) -> dict | None:
    if eh_virtual(did):
        raise ValueError("Operação não permitida em dataset virtual.")
    try:
        did_int = int(did)
    except (TypeError, ValueError):
        return None
    atual = obter_dataset(did_int, projeto_id, db_url=db_url)
    if atual is None:
        return None
    novo_nome = str(nome).strip() if nome is not None and str(nome).strip() else atual["nome"]
    novo_schema = atual["schema_json"] if schema_json is None else schema_json
    conn = _conn(db_url)
    try:
        agora = datetime.now().isoformat(timespec="seconds")
        if _sqlite(db_url):
            conn.execute(
                """update datasets set nome = ?, schema_json = ?, atualizado_em = ?
                   where id = ? and projeto_id = ?""",
                (novo_nome, json.dumps(novo_schema or {}, ensure_ascii=False), agora, did_int, projeto_id),
            )
            conn.commit()
        else:
            conn.execute(
                """update public.datasets set nome = %s, schema_json = %s, atualizado_em = %s
                   where id = %s and projeto_id = %s""",
                (novo_nome, novo_schema or {}, agora, did_int, projeto_id),
            )
            conn.commit()
        return obter_dataset(did_int, projeto_id, db_url=db_url)
    finally:
        conn.close()


def deletar_dataset(did, projeto_id: int, db_url=None) -> bool:
    if eh_virtual(did):
        raise ValueError("Operação não permitida em dataset virtual.")
    try:
        did_int = int(did)
    except (TypeError, ValueError):
        return False
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            cursor = conn.execute(
                "delete from datasets where id = ? and projeto_id = ?", (did_int, projeto_id)
            )
        else:
            cursor = conn.execute(
                "delete from public.datasets where id = %s and projeto_id = %s", (did_int, projeto_id)
            )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


# ------------------------------------------------------------------- linhas

def listar_linhas(did, projeto_id: int, db_url=None) -> list[dict]:
    virtual = id_virtual(did)
    if virtual:
        fonte, pid = virtual
        if pid != projeto_id:
            return []
        return _linhas_virtuais(fonte, pid, db_url=db_url)
    try:
        did_int = int(did)
    except (TypeError, ValueError):
        return []
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            linhas = conn.execute(
                """select id, dataset_id, row_index, data_json, criado_em
                   from dataset_rows where dataset_id = ? order by row_index""",
                (did_int,),
            ).fetchall()
            resultado = []
            for linha in linhas:
                item = dict(linha)
                item["data_json"] = _normalizar_json(item["data_json"])
                resultado.append(item)
            return resultado
        linhas = list(
            conn.execute(
                """select id, dataset_id, row_index, data_json, criado_em
                   from public.dataset_rows where dataset_id = %s order by row_index""",
                (did_int,),
            ).fetchall()
        )
        for item in linhas:
            item["data_json"] = _normalizar_json(item["data_json"])
        return linhas
    finally:
        conn.close()


def _linhas_virtuais(fonte: str, projeto_id: int, db_url=None) -> list[dict]:
    conn = _conn(db_url)
    try:
        if fonte == "locais":
            if _sqlite(db_url):
                linhas = conn.execute(
                    "select " + COLS_LOCAIS + " from locais where projeto_id = ? order by id",
                    (projeto_id,),
                ).fetchall()
            else:
                linhas = conn.execute(
                    "select " + COLS_LOCAIS + " from public.locais where projeto_id = %s order by id",
                    (projeto_id,),
                ).fetchall()
        else:
            if _sqlite(db_url):
                linhas = conn.execute(
                    "select " + COLS_ITENS + " from itens "
                    "where local_id in (select id from locais where projeto_id = ?) order by id",
                    (projeto_id,),
                ).fetchall()
            else:
                linhas = conn.execute(
                    "select " + COLS_ITENS + " from public.itens "
                    "where local_id in (select id from public.locais where projeto_id = %s) order by id",
                    (projeto_id,),
                ).fetchall()
        resultado = []
        for idx, linha in enumerate(linhas):
            resultado.append(
                {
                    "id": None,
                    "dataset_id": f"{fonte}-{projeto_id}",
                    "row_index": idx,
                    "data_json": dict(linha),
                    "criado_em": None,
                }
            )
        return resultado
    finally:
        conn.close()


def adicionar_linhas(did, projeto_id: int, rows, db_url=None) -> int:
    if eh_virtual(did):
        raise ValueError("Operação não permitida em dataset virtual.")
    try:
        did_int = int(did)
    except (TypeError, ValueError):
        raise ValueError("Dataset não encontrado.")
    if not rows:
        return 0
    dataset = obter_dataset(did_int, projeto_id, db_url=db_url)
    if dataset is None:
        raise ValueError("Dataset não encontrado.")
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            total = conn.execute(
                "select count(*) from dataset_rows where dataset_id = ?", (did_int,)
            ).fetchone()[0]
        else:
            total = conn.execute(
                "select count(*) from public.dataset_rows where dataset_id = %s", (did_int,)
            ).fetchone()["count"]
        if int(total) + len(rows) > LIMITE_LINHAS:
            raise ValueError(f"Limite de {LIMITE_LINHAS} linhas por dataset atingido.")
        agora = datetime.now().isoformat(timespec="seconds")
        if _sqlite(db_url):
            conn.executemany(
                """insert into dataset_rows (dataset_id, row_index, data_json, criado_em)
                   values (?, ?, ?, ?)
                   on conflict (dataset_id, row_index) do update set data_json = excluded.data_json""",
                [
                    (did_int, int(r["row_index"]), json.dumps(r.get("data_json") or {}, ensure_ascii=False), agora)
                    for r in rows
                ],
            )
            conn.execute("update datasets set atualizado_em = ? where id = ?", (agora, did_int))
            conn.commit()
        else:
            conn.executemany(
                """insert into public.dataset_rows (dataset_id, row_index, data_json)
                   values (%s, %s, %s)
                   on conflict (dataset_id, row_index) do update set data_json = excluded.data_json""",
                [(did_int, int(r["row_index"]), r.get("data_json") or {}) for r in rows],
            )
            conn.execute("update public.datasets set atualizado_em = %s where id = %s", (agora, did_int))
            conn.commit()
        return len(rows)
    finally:
        conn.close()
