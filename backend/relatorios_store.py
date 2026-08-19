"""Acesso a dados de relatórios gerados (Neon via psycopg ou SQLite local)."""

from datetime import datetime

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


def criar(publicacao_id: int, agendamento_id, storage_key: str, tamanho_bytes, status="gerado", db_url=None) -> dict:
    agora = datetime.now().isoformat(timespec="seconds")
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            cursor = conn.execute(
                "insert into relatorios (agendamento_id, publicacao_id, gerado_em, storage_key, tamanho_bytes, status) "
                "values (?, ?, ?, ?, ?, ?)",
                (agendamento_id, publicacao_id, agora, storage_key, tamanho_bytes, status),
            )
            conn.commit()
            rid = int(cursor.lastrowid)  # type: ignore[return-value]
        else:
            linha = conn.execute(
                "insert into public.relatorios (agendamento_id, publicacao_id, storage_key, tamanho_bytes, status) "
                "values (%s, %s, %s, %s, %s) returning id",
                (agendamento_id, publicacao_id, storage_key, tamanho_bytes, status),
            ).fetchone()
            conn.commit()
            rid = int(linha["id"])
    finally:
        conn.close()
    return obter(rid, db_url=db_url)


def obter(rid: int, db_url=None) -> dict | None:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            linha = conn.execute(
                "select id, agendamento_id, publicacao_id, gerado_em, storage_key, tamanho_bytes, status "
                "from relatorios where id = ?",
                (rid,),
            ).fetchone()
            return dict(linha) if linha else None
        return conn.execute(
            "select id, agendamento_id, publicacao_id, gerado_em, storage_key, tamanho_bytes, status "
            "from public.relatorios where id = %s",
            (rid,),
        ).fetchone()
    finally:
        conn.close()


def listar(publicacao_id=None, limit=50, db_url=None) -> list[dict]:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            if publicacao_id is None:
                linhas = conn.execute(
                    "select id, agendamento_id, publicacao_id, gerado_em, storage_key, tamanho_bytes, status "
                    "from relatorios order by id desc limit ?",
                    (limit,),
                ).fetchall()
            else:
                linhas = conn.execute(
                    "select id, agendamento_id, publicacao_id, gerado_em, storage_key, tamanho_bytes, status "
                    "from relatorios where publicacao_id = ? order by id desc limit ?",
                    (publicacao_id, limit),
                ).fetchall()
            return [dict(linha) for linha in linhas]
        if publicacao_id is None:
            return list(
                conn.execute(
                    "select id, agendamento_id, publicacao_id, gerado_em, storage_key, tamanho_bytes, status "
                    "from public.relatorios order by id desc limit %s",
                    (limit,),
                ).fetchall()
            )
        return list(
            conn.execute(
                "select id, agendamento_id, publicacao_id, gerado_em, storage_key, tamanho_bytes, status "
                "from public.relatorios where publicacao_id = %s order by id desc limit %s",
                (publicacao_id, limit),
            ).fetchall()
        )
    finally:
        conn.close()
