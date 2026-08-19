"""Acesso a dados de publicações (Neon via psycopg ou SQLite local).

Segue o mesmo padrão dos demais stores: ramificação por database_url().
"""

import secrets
from datetime import datetime

import audit_store
import db
import history


def _sqlite(db_url=None) -> bool:
    if db_url is not None:
        return not bool(db_url)
    return not db.enabled()


def _conn(db_url=None):
    if _sqlite(db_url):
        return history._conexao()
    return db.connect()


def _agora() -> str:
    return datetime.now().isoformat(timespec="seconds")


def criar(dashboard_id: int, criado_por: int, db_url=None) -> dict:
    token = secrets.token_urlsafe(32)
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            cursor = conn.execute(
                "insert into publicacoes (dashboard_id, token, criado_em, criado_por) values (?, ?, ?, ?)",
                (dashboard_id, token, _agora(), criado_por),
            )
            conn.commit()
            pid = int(cursor.lastrowid)  # type: ignore[return-value]
        else:
            linha = conn.execute(
                "insert into public.publicacoes (dashboard_id, token, criado_por) "
                "values (%s, %s, %s) returning id",
                (dashboard_id, token, criado_por),
            ).fetchone()
            conn.commit()
            pid = int(linha["id"])
    finally:
        conn.close()
    audit_store.registrar("publicacao", criado_por, pid, "publicacao", {"dashboard_id": dashboard_id}, db_url=db_url)
    return obter(pid, db_url=db_url)


def obter(pid: int, db_url=None) -> dict | None:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            linha = conn.execute(
                "select id, dashboard_id, token, revogado_em, criado_em, criado_por "
                "from publicacoes where id = ?",
                (pid,),
            ).fetchone()
            pub = dict(linha) if linha else None
        else:
            pub = conn.execute(
                "select id, dashboard_id, token, revogado_em, criado_em, criado_por "
                "from public.publicacoes where id = %s",
                (pid,),
            ).fetchone()
        return pub
    finally:
        conn.close()


def obter_por_token(token: str, db_url=None) -> dict | None:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            linha = conn.execute(
                "select id, dashboard_id, token, revogado_em, criado_em, criado_por "
                "from publicacoes where token = ? and revogado_em is null",
                (token,),
            ).fetchone()
            pub = dict(linha) if linha else None
        else:
            pub = conn.execute(
                "select id, dashboard_id, token, revogado_em, criado_em, criado_por "
                "from public.publicacoes where token = %s and revogado_em is null",
                (token,),
            ).fetchone()
        return pub
    finally:
        conn.close()


def revogar(pid: int, db_url=None) -> bool:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            cursor = conn.execute(
                "update publicacoes set revogado_em = ? where id = ? and revogado_em is null",
                (_agora(), pid),
            )
            conn.commit()
        else:
            cursor = conn.execute(
                "update public.publicacoes set revogado_em = now() "
                "where id = %s and revogado_em is null",
                (pid,),
            )
            conn.commit()
        ok = cursor.rowcount > 0
    finally:
        conn.close()
    if ok:
        pub = obter(pid, db_url=db_url)
        audit_store.registrar("revogacao", pub["criado_por"] if pub else None, pid, "publicacao", None, db_url=db_url)
    return ok


def listar_por_dashboard(dashboard_id: int, db_url=None) -> list[dict]:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            linhas = conn.execute(
                "select id, dashboard_id, token, revogado_em, criado_em, criado_por "
                "from publicacoes where dashboard_id = ? order by id desc",
                (dashboard_id,),
            ).fetchall()
            return [dict(linha) for linha in linhas]
        return list(
            conn.execute(
                "select id, dashboard_id, token, revogado_em, criado_em, criado_por "
                "from public.publicacoes where dashboard_id = %s order by id desc",
                (dashboard_id,),
            ).fetchall()
        )
    finally:
        conn.close()
