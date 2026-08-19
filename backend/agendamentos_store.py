"""Acesso a dados de agendamentos (Neon via psycopg ou SQLite local)."""

from datetime import datetime, timedelta

import db
import history

PERIODICIDADES = ("diaria", "semanal", "mensal", "on_demand")


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


def calcular_proxima_execucao(periodicidade: str, base: datetime | None = None) -> str:
    base = base or datetime.now()
    if periodicidade == "diaria":
        nova = base + timedelta(days=1)
    elif periodicidade == "semanal":
        nova = base + timedelta(days=7)
    elif periodicidade == "mensal":
        ano = base.year + (1 if base.month == 12 else 0)
        mes = 1 if base.month == 12 else base.month + 1
        dia = min(base.day, 28)
        nova = base.replace(year=ano, month=mes, day=dia)
    else:  # on_demand
        nova = base
    return nova.isoformat(timespec="seconds")


def criar(publicacao_id: int, periodicidade: str, criado_por: int, db_url=None) -> dict:
    periodicidade = (periodicidade or "").strip().lower()
    if periodicidade not in PERIODICIDADES:
        raise ValueError("Periodicidade inválida. Use diaria, semanal, mensal ou on_demand.")
    proxima = calcular_proxima_execucao(periodicidade)
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            cursor = conn.execute(
                "insert into agendamentos (publicacao_id, periodicidade, proxima_execucao, ativo, criado_em, criado_por) "
                "values (?, ?, ?, 1, ?, ?)",
                (publicacao_id, periodicidade, proxima, _agora(), criado_por),
            )
            conn.commit()
            aid = int(cursor.lastrowid)  # type: ignore[return-value]
        else:
            linha = conn.execute(
                "insert into public.agendamentos (publicacao_id, periodicidade, proxima_execucao, criado_por) "
                "values (%s, %s, %s, %s) returning id",
                (publicacao_id, periodicidade, proxima, criado_por),
            ).fetchone()
            conn.commit()
            aid = int(linha["id"])
    finally:
        conn.close()
    return obter(aid, db_url=db_url)


def obter(aid: int, db_url=None) -> dict | None:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            linha = conn.execute(
                "select id, publicacao_id, periodicidade, proxima_execucao, ativo, criado_em, criado_por "
                "from agendamentos where id = ?",
                (aid,),
            ).fetchone()
            return dict(linha) if linha else None
        return conn.execute(
            "select id, publicacao_id, periodicidade, proxima_execucao, ativo, criado_em, criado_por "
            "from public.agendamentos where id = %s",
            (aid,),
        ).fetchone()
    finally:
        conn.close()


def listar(criado_por: int | None = None, db_url=None) -> list[dict]:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            if criado_por is None:
                linhas = conn.execute(
                    "select id, publicacao_id, periodicidade, proxima_execucao, ativo, criado_em, criado_por "
                    "from agendamentos order by id desc"
                ).fetchall()
            else:
                linhas = conn.execute(
                    "select id, publicacao_id, periodicidade, proxima_execucao, ativo, criado_em, criado_por "
                    "from agendamentos where criado_por = ? order by id desc",
                    (criado_por,),
                ).fetchall()
            return [dict(linha) for linha in linhas]
        if criado_por is None:
            return list(
                conn.execute(
                    "select id, publicacao_id, periodicidade, proxima_execucao, ativo, criado_em, criado_por "
                    "from public.agendamentos order by id desc"
                ).fetchall()
            )
        return list(
            conn.execute(
                "select id, publicacao_id, periodicidade, proxima_execucao, ativo, criado_em, criado_por "
                "from public.agendamentos where criado_por = %s order by id desc",
                (criado_por,),
            ).fetchall()
        )
    finally:
        conn.close()


def atualizar(aid: int, *, periodicidade=None, ativo=None, proxima_execucao=None, db_url=None) -> dict | None:
    atual = obter(aid, db_url=db_url)
    if atual is None:
        return None
    novo_period = (periodicidade or "").strip().lower() if periodicidade is not None else atual["periodicidade"]
    if novo_period not in PERIODICIDADES:
        raise ValueError("Periodicidade inválida.")
    novo_ativo = atual["ativo"] if ativo is None else (1 if ativo else 0)
    nova_proxima = atual["proxima_execucao"] if proxima_execucao is None else proxima_execucao
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            conn.execute(
                "update agendamentos set periodicidade = ?, ativo = ?, proxima_execucao = ? where id = ?",
                (novo_period, novo_ativo, nova_proxima, aid),
            )
            conn.commit()
        else:
            conn.execute(
                "update public.agendamentos set periodicidade = %s, ativo = %s, proxima_execucao = %s where id = %s",
                (novo_period, bool(novo_ativo), nova_proxima, aid),
            )
            conn.commit()
        return obter(aid, db_url=db_url)
    finally:
        conn.close()


def deletar(aid: int, db_url=None) -> bool:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            cursor = conn.execute("delete from agendamentos where id = ?", (aid,))
        else:
            cursor = conn.execute("delete from public.agendamentos where id = %s", (aid,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def listar_pendentes(db_url=None) -> list[dict]:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            linhas = conn.execute(
                "select id, publicacao_id, periodicidade, proxima_execucao, ativo, criado_em, criado_por "
                "from agendamentos where ativo = 1 and proxima_execucao <= ? order by proxima_execucao",
                (_agora(),),
            ).fetchall()
            return [dict(linha) for linha in linhas]
        return list(
            conn.execute(
                "select id, publicacao_id, periodicidade, proxima_execucao, ativo, criado_em, criado_por "
                "from public.agendamentos where ativo = true and proxima_execucao <= now() "
                "order by proxima_execucao"
            ).fetchall()
        )
    finally:
        conn.close()
