"""Registro e consulta de log de auditoria (Neon via psycopg ou SQLite local)."""

import json
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


def _normalizar_json(valor):
    if isinstance(valor, str):
        try:
            return json.loads(valor)
        except (TypeError, ValueError):
            return {}
    return valor or {}


def registrar(evento: str, usuario_id, alvo_id=None, alvo_tipo=None, metadata=None, db_url=None) -> int:
    agora = datetime.now().isoformat(timespec="seconds")
    meta = metadata or {}
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            cursor = conn.execute(
                "insert into audit_log (evento, usuario_id, alvo_id, alvo_tipo, criado_em, metadata_json) "
                "values (?, ?, ?, ?, ?, ?)",
                (evento, usuario_id, alvo_id, alvo_tipo, agora, json.dumps(meta, ensure_ascii=False)),
            )
            conn.commit()
            return int(cursor.lastrowid)  # type: ignore[return-value]
        linha = conn.execute(
            "insert into public.audit_log (evento, usuario_id, alvo_id, alvo_tipo, metadata_json) "
            "values (%s, %s, %s, %s, %s) returning id",
            (evento, usuario_id, alvo_id, alvo_tipo, meta),
        ).fetchone()
        conn.commit()
        return int(linha["id"])
    finally:
        conn.close()


def listar(evento=None, limit=100, offset=0, db_url=None) -> list[dict]:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            if evento:
                linhas = conn.execute(
                    "select id, evento, usuario_id, alvo_id, alvo_tipo, criado_em, metadata_json "
                    "from audit_log where evento = ? order by id desc limit ? offset ?",
                    (evento, limit, offset),
                ).fetchall()
            else:
                linhas = conn.execute(
                    "select id, evento, usuario_id, alvo_id, alvo_tipo, criado_em, metadata_json "
                    "from audit_log order by id desc limit ? offset ?",
                    (limit, offset),
                ).fetchall()
            registros = [dict(linha) for linha in linhas]
        else:
            if evento:
                registros = list(
                    conn.execute(
                        "select id, evento, usuario_id, alvo_id, alvo_tipo, criado_em, metadata_json "
                        "from public.audit_log where evento = %s order by id desc limit %s offset %s",
                        (evento, limit, offset),
                    ).fetchall()
                )
            else:
                registros = list(
                    conn.execute(
                        "select id, evento, usuario_id, alvo_id, alvo_tipo, criado_em, metadata_json "
                        "from public.audit_log order by id desc limit %s offset %s",
                        (limit, offset),
                    ).fetchall()
                )
        for r in registros:
            r["metadata_json"] = _normalizar_json(r["metadata_json"])
        return registros
    finally:
        conn.close()
