import os
from pathlib import Path

SCHEMA_PATH = Path(__file__).with_name("schema.sql")

_schema_tentado = False
_schema_pronto = False
erro_schema: str | None = None


def database_url() -> str | None:
    return os.getenv("DATABASE_URL")


def enabled() -> bool:
    return bool(database_url())


def _migrar_legado(conn) -> None:
    linha = conn.execute("select to_regclass('public.locais') as tabela").fetchone()
    if not linha["tabela"]:
        return
    colunas = {
        c["column_name"]
        for c in conn.execute(
            """select column_name from information_schema.columns
               where table_schema = 'public' and table_name = 'locais'"""
        ).fetchall()
    }
    if colunas and "projeto_id" not in colunas:
        conn.execute("drop table if exists public.itens cascade")
        conn.execute("drop table if exists public.locais cascade")
        conn.execute("drop table if exists public.uploads cascade")


def _coluna_existe(conn, tabela: str, coluna: str) -> bool:
    linha = conn.execute(
        """select 1 as ok from information_schema.columns
           where table_schema = 'public' and table_name = %s and column_name = %s""",
        (tabela, coluna),
    ).fetchone()
    return bool(linha)


def _aplicar_migracoes(conn) -> None:
    linha = conn.execute("select to_regclass('public.projetos') as tabela").fetchone()
    if not linha["tabela"]:
        return
    if not _coluna_existe(conn, "projetos", "cliente_usuario_id"):
        conn.execute(
            "alter table public.projetos "
            "add column cliente_usuario_id bigint references public.usuarios(id) on delete set null"
        )
    linha_check = conn.execute(
        """select conname from pg_constraint
           where conrelid = 'public.usuarios'::regclass
             and contype = 'c' and pg_get_constraintdef(oid) like '%papel%'"""
    ).fetchone()
    if linha_check:
        conn.execute(f"alter table public.usuarios drop constraint {linha_check['conname']}")
        conn.execute(
            "alter table public.usuarios "
            "add constraint usuarios_papel_check check (papel in ('admin', 'usuario', 'cliente'))"
        )


def _garantir_schema(conn) -> None:
    global _schema_tentado, _schema_pronto, erro_schema
    if _schema_tentado:
        return
    _schema_tentado = True
    try:
        _migrar_legado(conn)
        _aplicar_migracoes(conn)
        conn.execute(SCHEMA_PATH.read_text(encoding="utf-8"))
        conn.commit()
        _schema_pronto = True
        erro_schema = None
    except Exception as exc:
        erro_schema = f"{type(exc).__name__}: {exc}"
        conn.rollback()


def connect(user_id: int | None = None):
    import psycopg
    from psycopg.rows import dict_row

    conn = psycopg.connect(database_url(), connect_timeout=10, row_factory=dict_row)
    _garantir_schema(conn)
    if user_id is not None:
        conn.execute("select set_config('app.current_user_id', %s, false)", (str(user_id),))
    return conn


def ensure_schema() -> None:
    connect().close()


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
