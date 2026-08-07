import os
from datetime import date, datetime, time
from math import ceil
from pathlib import Path

import pandas as pd

import loader


SCHEMA_PATH = Path(__file__).with_name("schema.sql")


def database_url() -> str | None:
    value = os.getenv("DATABASE_URL")
    if value:
        return value
    try:
        import streamlit as st

        value = st.secrets.get("DATABASE_URL")
        return str(value) if value else None
    except Exception:
        return None


def enabled() -> bool:
    return bool(database_url())


def connect(user_id: int | None = None):
    import psycopg
    from psycopg.rows import dict_row

    conn = psycopg.connect(database_url(), connect_timeout=10, row_factory=dict_row)
    if user_id is not None:
        conn.execute("select set_config('app.current_user_id', %s, false)", (str(user_id),))
    return conn


def ensure_schema() -> None:
    schema = SCHEMA_PATH.read_text(encoding="utf-8")
    with connect() as conn:
        conn.execute(schema)


def _as_float(value) -> float:
    return float(value or 0)


def _as_datetime(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, time())
    return loader._to_date(value)


def get_user_by_username(username: str) -> dict | None:
    with connect() as conn:
        return conn.execute(
            """select id, username, nome, senha_hash, salt, papel, ativo, criado_em
               from public.usuarios where username = %s""",
            (username.strip().lower(),),
        ).fetchone()


def get_user(user_id: int) -> dict | None:
    with connect() as conn:
        return conn.execute(
            """select id, username, nome, papel, ativo, criado_em
               from public.usuarios where id = %s""",
            (user_id,),
        ).fetchone()


def count_admins() -> int:
    with connect() as conn:
        row = conn.execute(
            "select count(*) as total from public.usuarios where papel = 'admin'"
        ).fetchone()
        return int(row["total"])


def list_users() -> list[dict]:
    with connect() as conn:
        return list(
            conn.execute(
                """select id, username, nome, papel, ativo, criado_em
                   from public.usuarios order by criado_em, id"""
            ).fetchall()
        )


def create_user(username: str, nome: str, senha_hash: str, salt: str, papel: str) -> int:
    with connect() as conn:
        row = conn.execute(
            """insert into public.usuarios (username, nome, senha_hash, salt, papel)
               values (%s, %s, %s, %s, %s)
               returning id""",
            (username.strip().lower(), nome.strip(), senha_hash, salt, papel),
        ).fetchone()
        return int(row["id"])


def set_user_active(user_id: int, ativo: bool) -> None:
    with connect() as conn:
        conn.execute("update public.usuarios set ativo = %s where id = %s", (ativo, user_id))


def reset_password(user_id: int, senha_hash: str, salt: str) -> None:
    with connect() as conn:
        conn.execute(
            "update public.usuarios set senha_hash = %s, salt = %s where id = %s",
            (senha_hash, salt, user_id),
        )


def _months_return(local: loader.Local) -> int | None:
    if local.saldo_mensal <= 0:
        return None
    return ceil((local.investimento - local.taxa_instalacao) / local.saldo_mensal)


def save_snapshot(user_id: int, sha256: str, filename: str, file_bytes: bytes, locais: list[loader.Local]) -> int:
    with connect(user_id) as conn:
        conn.execute("delete from public.uploads where user_id = %s and sha256 = %s", (user_id, sha256))
        upload = conn.execute(
            """insert into public.uploads (user_id, sha256, filename, arquivo)
               values (%s, %s, %s, %s) returning id""",
            (user_id, sha256, filename, file_bytes),
        ).fetchone()
        upload_id = int(upload["id"])
        for local in locais:
            local_row = conn.execute(
                """insert into public.locais
                   (upload_id, nome, valor_mensal, taxa_instalacao, custo_manutencao,
                    mensal_terceirizada, chip_mensal, custos_softwares, mao_de_obra, data_inst,
                    saldo_mensal, investimento, equipamento, tempo_retorno, meses_retorno, margem)
                   values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                           %s, %s, %s, %s, %s, %s)
                   returning id""",
                (
                    upload_id,
                    local.nome,
                    local.valor_mensal,
                    local.taxa_instalacao,
                    local.custo_manutencao,
                    local.mensal_terceirizada,
                    local.chip_mensal,
                    local.custos_softwares,
                    local.mao_de_obra,
                    local.data_inst.date() if local.data_inst else None,
                    local.saldo_mensal,
                    local.investimento,
                    local.equipamento,
                    local.tempo_retorno,
                    _months_return(local),
                    local.margem,
                ),
            ).fetchone()
            local_id = int(local_row["id"])
            for item in local.itens:
                conn.execute(
                    """insert into public.itens
                       (upload_id, local_id, categoria, cod, material, qtd, valor_unit, valor_total)
                       values (%s, %s, %s, %s, %s, %s, %s, %s)""",
                    (upload_id, local_id, item.categoria, item.cod, item.material, item.qtd, item.valor_unit, item.valor_total),
                )
        return upload_id


def list_uploads(user_id: int) -> pd.DataFrame:
    with connect(user_id) as conn:
        rows = conn.execute(
            """select id, sha256, filename, uploaded_at
               from public.uploads where user_id = %s order by uploaded_at desc, id desc""",
            (user_id,),
        ).fetchall()
    return pd.DataFrame(rows, columns=["id", "sha256", "filename", "uploaded_at"])


def load_workbook(user_id: int, upload_id: int) -> loader.WorkbookData:
    with connect(user_id) as conn:
        upload = conn.execute(
            "select id from public.uploads where id = %s and user_id = %s",
            (upload_id, user_id),
        ).fetchone()
        if upload is None:
            raise ValueError("Snapshot não encontrado para este usuário.")
        local_rows = conn.execute(
            """select id, nome, valor_mensal, taxa_instalacao, custo_manutencao,
                      mensal_terceirizada, chip_mensal, custos_softwares, mao_de_obra, data_inst
               from public.locais where upload_id = %s order by id""",
            (upload_id,),
        ).fetchall()
        itens_por_local = {}
        for row in local_rows:
            itens_por_local[row["id"]] = conn.execute(
                """select categoria, cod, material, qtd, valor_unit, valor_total
                   from public.itens where local_id = %s order by id""",
                (row["id"],),
            ).fetchall()
    locais = []
    for row in local_rows:
        itens = [
            loader.Item(
                cod=str(item["cod"] or ""),
                material=item["material"],
                qtd=_as_float(item["qtd"]),
                valor_unit=_as_float(item["valor_unit"]),
                valor_total=_as_float(item["valor_total"]),
                categoria=item["categoria"],
            )
            for item in itens_por_local[row["id"]]
        ]
        locais.append(
            loader.Local(
                nome=row["nome"],
                valor_mensal=_as_float(row["valor_mensal"]),
                taxa_instalacao=_as_float(row["taxa_instalacao"]),
                custo_manutencao=_as_float(row["custo_manutencao"]),
                mensal_terceirizada=_as_float(row["mensal_terceirizada"]),
                chip_mensal=_as_float(row["chip_mensal"]),
                custos_softwares=_as_float(row["custos_softwares"]),
                mao_de_obra=_as_float(row["mao_de_obra"]),
                data_inst=_as_datetime(row["data_inst"]),
                itens=itens.copy(),
            )
        )
    return loader.WorkbookData(locais=locais)


def history_locais(user_id: int) -> pd.DataFrame:
    with connect(user_id) as conn:
        rows = conn.execute(
            """select u.id as upload_id, u.filename, u.uploaded_at, l.nome as local,
                      l.valor_mensal, l.saldo_mensal, l.investimento, l.equipamento,
                      l.mao_de_obra, l.tempo_retorno, l.meses_retorno, l.margem, l.data_inst
               from public.locais l
               join public.uploads u on u.id = l.upload_id
               where u.user_id = %s
               order by u.uploaded_at, l.nome""",
            (user_id,),
        ).fetchall()
    return pd.DataFrame(rows)


def delete_upload(user_id: int, upload_id: int) -> None:
    with connect(user_id) as conn:
        conn.execute("delete from public.uploads where id = %s and user_id = %s", (upload_id, user_id))
