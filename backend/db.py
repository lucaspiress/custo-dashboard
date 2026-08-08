import os
from pathlib import Path

SCHEMA_PATH = Path(__file__).with_name("schema.sql")


def database_url() -> str | None:
    return os.getenv("DATABASE_URL")


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
