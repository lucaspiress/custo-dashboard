"""Acesso a dados de dashboards, widgets e slicers (Neon via psycopg ou SQLite local).

Segue o mesmo padrão de datasets_store.py: a ramificação é feita por database_url().
As tabelas são criadas no boot (schema.sql no Neon, history._inicializar no SQLite).
"""

import json
from datetime import datetime

import db
import history

LIMITE_DASHBOARDS = 20
LIMITE_WIDGETS = 50


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


def _contar(conn, tabela: str, coluna: str, valor, sqlite: bool) -> int:
    if sqlite:
        return int(conn.execute(f"select count(*) from {tabela} where {coluna} = ?", (valor,)).fetchone()[0])
    return int(conn.execute(f"select count(*) from public.{tabela} where {coluna} = %s", (valor,)).fetchone()["count"])


# -------------------------------------------------------------- dashboards

def listar_dashboards(projeto_id: int, db_url=None) -> list[dict]:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            linhas = conn.execute(
                """select id, projeto_id, nome, layout_json, eh_interno, criado_em, atualizado_em
                   from dashboards where projeto_id = ? order by id""",
                (projeto_id,),
            ).fetchall()
            dashboards = [dict(linha) for linha in linhas]
        else:
            dashboards = list(
                conn.execute(
                    """select id, projeto_id, nome, layout_json, eh_interno, criado_em, atualizado_em
                       from public.dashboards where projeto_id = %s order by id""",
                    (projeto_id,),
                ).fetchall()
            )
        for d in dashboards:
            d["layout_json"] = _normalizar_json(d["layout_json"])
            d["eh_interno"] = bool(d["eh_interno"])
            d["widget_count"] = _contar(conn, "widgets", "dashboard_id", d["id"], _sqlite(db_url))
            d["slicer_count"] = _contar(conn, "slicers", "dashboard_id", d["id"], _sqlite(db_url))
        return dashboards
    finally:
        conn.close()


def obter_dashboard(dbid: int, projeto_id: int, db_url=None) -> dict | None:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            linha = conn.execute(
                """select id, projeto_id, nome, layout_json, eh_interno, criado_em, atualizado_em
                   from dashboards where id = ? and projeto_id = ?""",
                (dbid, projeto_id),
            ).fetchone()
            dashboard = dict(linha) if linha else None
        else:
            dashboard = conn.execute(
                """select id, projeto_id, nome, layout_json, eh_interno, criado_em, atualizado_em
                   from public.dashboards where id = %s and projeto_id = %s""",
                (dbid, projeto_id),
            ).fetchone()
        if dashboard is None:
            return None
        dashboard["layout_json"] = _normalizar_json(dashboard["layout_json"])
        dashboard["eh_interno"] = bool(dashboard["eh_interno"])
        dashboard["widgets"] = _listar_widgets(conn, dbid, db_url)
        dashboard["slicers"] = _listar_slicers(conn, dbid, db_url)
        return dashboard
    finally:
        conn.close()


def listar_internos(db_url=None) -> list[dict]:
    """Lista dashboards com eh_interno=true (todos os projetos)."""
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            linhas = conn.execute(
                """select id, projeto_id, nome, layout_json, eh_interno, criado_em, atualizado_em
                   from dashboards where eh_interno = 1 order by id desc""",
            ).fetchall()
            dashboards = [dict(linha) for linha in linhas]
        else:
            dashboards = list(
                conn.execute(
                    """select id, projeto_id, nome, layout_json, eh_interno, criado_em, atualizado_em
                       from public.dashboards where eh_interno = true order by id desc"""
                ).fetchall()
            )
        for d in dashboards:
            d["layout_json"] = _normalizar_json(d["layout_json"])
            d["eh_interno"] = bool(d["eh_interno"])
            d["widgets_count"] = _contar(conn, "widgets", "dashboard_id", d["id"], _sqlite(db_url))
        return dashboards
    finally:
        conn.close()


def obter_dashboard_por_id(dbid: int, db_url=None) -> dict | None:
    """Busca dashboard por id, sem filtrar por projeto (usado nas rotas de widgets/slicers/query)."""
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            linha = conn.execute(
                """select id, projeto_id, nome, layout_json, eh_interno, criado_em, atualizado_em
                   from dashboards where id = ?""",
                (dbid,),
            ).fetchone()
            dashboard = dict(linha) if linha else None
        else:
            dashboard = conn.execute(
                """select id, projeto_id, nome, layout_json, eh_interno, criado_em, atualizado_em
                   from public.dashboards where id = %s""",
                (dbid,),
            ).fetchone()
        if dashboard:
            dashboard["layout_json"] = _normalizar_json(dashboard["layout_json"])
            dashboard["eh_interno"] = bool(dashboard["eh_interno"])
            dashboard["widgets"] = _listar_widgets(conn, dbid, db_url)
            dashboard["slicers"] = _listar_slicers(conn, dbid, db_url)
        return dashboard
    finally:
        conn.close()


def _inserir_widget(conn, dbid: int, type: str, dataset_id: str, config_json, position_json, ordem: int, db_url) -> int:
    if _sqlite(db_url):
        cursor = conn.execute(
            """insert into widgets (dashboard_id, type, dataset_id, config_json, position_json, ordem)
               values (?, ?, ?, ?, ?, ?)""",
            (dbid, type, dataset_id, json.dumps(config_json or {}, ensure_ascii=False),
             json.dumps(position_json or {}, ensure_ascii=False), ordem),
        )
        return int(cursor.lastrowid)  # type: ignore[return-value]
    linha = conn.execute(
        """insert into public.widgets (dashboard_id, type, dataset_id, config_json, position_json, ordem)
           values (%s, %s, %s, %s, %s, %s) returning id""",
        (dbid, type, dataset_id, config_json or {}, position_json or {}, ordem),
    ).fetchone()
    return int(linha["id"])


def criar_dashboard(projeto_id: int, nome: str, layout_json=None, eh_interno: bool = False, db_url=None) -> dict:
    nome = str(nome or "").strip()
    if not nome:
        raise ValueError("Informe o nome do dashboard.")
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            total = conn.execute(
                "select count(*) from dashboards where projeto_id = ?", (projeto_id,)
            ).fetchone()[0]
        else:
            total = conn.execute(
                "select count(*) from public.dashboards where projeto_id = %s", (projeto_id,)
            ).fetchone()["count"]
        if int(total) >= LIMITE_DASHBOARDS:
            raise ValueError(f"Limite de {LIMITE_DASHBOARDS} dashboards por projeto atingido.")
        layout = layout_json or {}
        agora = datetime.now().isoformat(timespec="seconds")
        if _sqlite(db_url):
            cursor = conn.execute(
                """insert into dashboards (projeto_id, nome, layout_json, eh_interno, criado_em, atualizado_em)
                   values (?, ?, ?, ?, ?, ?)""",
                (projeto_id, nome, json.dumps(layout, ensure_ascii=False), 1 if eh_interno else 0, agora, agora),
            )
            dbid = int(cursor.lastrowid)  # type: ignore[return-value]
            conn.commit()
        else:
            linha = conn.execute(
                """insert into public.dashboards (projeto_id, nome, layout_json, eh_interno)
                   values (%s, %s, %s, %s) returning id""",
                (projeto_id, nome, layout, eh_interno),
            ).fetchone()
            dbid = int(linha["id"])
            conn.commit()
        # primeiro dashboard do projeto: popular com widgets de locais/itens (compatibilidade)
        if int(total) == 0:
            _inserir_widget(conn, dbid, "table", f"locais-{projeto_id}",
                            {"colunas": ["nome", "valor_mensal", "data_inst"]},
                            {"x": 0, "y": 0, "w": 6, "h": 4}, 0, db_url)
            _inserir_widget(conn, dbid, "table", f"itens-{projeto_id}",
                            {"colunas": ["categoria", "material", "qtd", "valor_total"]},
                            {"x": 6, "y": 0, "w": 6, "h": 4}, 1, db_url)
            conn.commit()
        return obter_dashboard(dbid, projeto_id, db_url=db_url)  # type: ignore[return-value]
    finally:
        conn.close()


def atualizar_dashboard(dbid: int, projeto_id: int, *, nome=None, layout_json=None, eh_interno=None, db_url=None) -> dict | None:
    atual = obter_dashboard(dbid, projeto_id, db_url=db_url)
    if atual is None:
        return None
    novo_nome = str(nome).strip() if nome is not None and str(nome).strip() else atual["nome"]
    novo_layout = atual["layout_json"] if layout_json is None else layout_json
    novo_eh = atual["eh_interno"] if eh_interno is None else bool(eh_interno)
    conn = _conn(db_url)
    try:
        agora = datetime.now().isoformat(timespec="seconds")
        if _sqlite(db_url):
            conn.execute(
                """update dashboards set nome = ?, layout_json = ?, eh_interno = ?, atualizado_em = ?
                   where id = ? and projeto_id = ?""",
                (novo_nome, json.dumps(novo_layout or {}, ensure_ascii=False), 1 if novo_eh else 0, agora, dbid, projeto_id),
            )
            conn.commit()
        else:
            conn.execute(
                """update public.dashboards set nome = %s, layout_json = %s, eh_interno = %s, atualizado_em = %s
                   where id = %s and projeto_id = %s""",
                (novo_nome, novo_layout or {}, novo_eh, agora, dbid, projeto_id),
            )
            conn.commit()
        return obter_dashboard(dbid, projeto_id, db_url=db_url)  # type: ignore[return-value]
    finally:
        conn.close()


def deletar_dashboard(dbid: int, projeto_id: int, db_url=None) -> bool:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            cursor = conn.execute("delete from dashboards where id = ? and projeto_id = ?", (dbid, projeto_id))
        else:
            cursor = conn.execute("delete from public.dashboards where id = %s and projeto_id = %s", (dbid, projeto_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


# ------------------------------------------------------------------ widgets

def _listar_widgets(conn, dbid: int, db_url) -> list[dict]:
    if _sqlite(db_url):
        linhas = conn.execute(
            """select id, dashboard_id, type, dataset_id, config_json, position_json, ordem
               from widgets where dashboard_id = ? order by ordem, id""",
            (dbid,),
        ).fetchall()
        widgets = [dict(linha) for linha in linhas]
    else:
        widgets = list(
            conn.execute(
                """select id, dashboard_id, type, dataset_id, config_json, position_json, ordem
                   from public.widgets where dashboard_id = %s order by ordem, id""",
                (dbid,),
            ).fetchall()
        )
    for w in widgets:
        w["config_json"] = _normalizar_json(w["config_json"])
        w["position_json"] = _normalizar_json(w["position_json"])
    return widgets


def obter_widget(wid: int, db_url=None) -> dict | None:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            linha = conn.execute(
                """select id, dashboard_id, type, dataset_id, config_json, position_json, ordem
                   from widgets where id = ?""",
                (wid,),
            ).fetchone()
            widget = dict(linha) if linha else None
        else:
            widget = conn.execute(
                """select id, dashboard_id, type, dataset_id, config_json, position_json, ordem
                   from public.widgets where id = %s""",
                (wid,),
            ).fetchone()
        if widget:
            widget["config_json"] = _normalizar_json(widget["config_json"])
            widget["position_json"] = _normalizar_json(widget["position_json"])
        return widget
    finally:
        conn.close()


def adicionar_widget(dbid: int, projeto_id: int, type, dataset_id, config_json=None, position_json=None, db_url=None) -> dict:
    if not type or not str(type).strip():
        raise ValueError("Informe o tipo do widget.")
    if not dataset_id or not str(dataset_id).strip():
        raise ValueError("Informe o dataset do widget.")
    dashboard = obter_dashboard(dbid, projeto_id, db_url=db_url)
    if dashboard is None:
        raise ValueError("Dashboard não encontrado.")
    conn = _conn(db_url)
    try:
        total = _contar(conn, "widgets", "dashboard_id", dbid, _sqlite(db_url))
        if total >= LIMITE_WIDGETS:
            raise ValueError(f"Limite de {LIMITE_WIDGETS} widgets por dashboard atingido.")
        wid = _inserir_widget(conn, dbid, str(type).strip(), str(dataset_id).strip(),
                              config_json, position_json, total, db_url)
        conn.commit()
        return obter_widget(wid, db_url=db_url)  # type: ignore[return-value]
    finally:
        conn.close()


def atualizar_widget(wid: int, *, type=None, dataset_id=None, config_json=None, position_json=None, ordem=None, db_url=None) -> dict | None:
    atual = obter_widget(wid, db_url=db_url)
    if atual is None:
        return None
    novo_type = str(type).strip() if type is not None and str(type).strip() else atual["type"]
    novo_dataset = str(dataset_id).strip() if dataset_id is not None and str(dataset_id).strip() else atual["dataset_id"]
    novo_config = atual["config_json"] if config_json is None else config_json
    novo_pos = atual["position_json"] if position_json is None else position_json
    novo_ordem = atual["ordem"] if ordem is None else int(ordem)
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            conn.execute(
                """update widgets set type = ?, dataset_id = ?, config_json = ?, position_json = ?, ordem = ?
                   where id = ?""",
                (novo_type, novo_dataset, json.dumps(novo_config or {}, ensure_ascii=False),
                 json.dumps(novo_pos or {}, ensure_ascii=False), novo_ordem, wid),
            )
            conn.commit()
        else:
            conn.execute(
                """update public.widgets set type = %s, dataset_id = %s, config_json = %s, position_json = %s, ordem = %s
                   where id = %s""",
                (novo_type, novo_dataset, novo_config or {}, novo_pos or {}, novo_ordem, wid),
            )
            conn.commit()
        return obter_widget(wid, db_url=db_url)  # type: ignore[return-value]
    finally:
        conn.close()


def deletar_widget(wid: int, db_url=None) -> bool:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            cursor = conn.execute("delete from widgets where id = ?", (wid,))
        else:
            cursor = conn.execute("delete from public.widgets where id = %s", (wid,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


# ------------------------------------------------------------------ slicers

def _listar_slicers(conn, dbid: int, db_url) -> list[dict]:
    if _sqlite(db_url):
        linhas = conn.execute(
            """select id, dashboard_id, dataset_id, field, values_json, tipo
               from slicers where dashboard_id = ? order by id""",
            (dbid,),
        ).fetchall()
        slicers = [dict(linha) for linha in linhas]
    else:
        slicers = list(
            conn.execute(
                """select id, dashboard_id, dataset_id, field, values_json, tipo
                   from public.slicers where dashboard_id = %s order by id""",
                (dbid,),
            ).fetchall()
        )
    for s in slicers:
        s["values_json"] = _normalizar_json(s["values_json"])
    return slicers


def obter_slicer(sid: int, db_url=None) -> dict | None:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            linha = conn.execute(
                """select id, dashboard_id, dataset_id, field, values_json, tipo
                   from slicers where id = ?""",
                (sid,),
            ).fetchone()
            slicer = dict(linha) if linha else None
        else:
            slicer = conn.execute(
                """select id, dashboard_id, dataset_id, field, values_json, tipo
                   from public.slicers where id = %s""",
                (sid,),
            ).fetchone()
        if slicer:
            slicer["values_json"] = _normalizar_json(slicer["values_json"])
        return slicer
    finally:
        conn.close()


def adicionar_slicer(dbid: int, dataset_id, field, tipo, values_json=None, db_url=None) -> dict:
    if not dataset_id or not str(dataset_id).strip():
        raise ValueError("Informe o dataset do slicer.")
    if not field or not str(field).strip():
        raise ValueError("Informe o campo do slicer.")
    if not tipo or not str(tipo).strip():
        raise ValueError("Informe o tipo do slicer.")
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            cursor = conn.execute(
                """insert into slicers (dashboard_id, dataset_id, field, values_json, tipo)
                   values (?, ?, ?, ?, ?)""",
                (dbid, str(dataset_id).strip(), str(field).strip(),
                 json.dumps(values_json or [], ensure_ascii=False), str(tipo).strip()),
            )
            conn.commit()
            sid = int(cursor.lastrowid)  # type: ignore[return-value]
        else:
            linha = conn.execute(
                """insert into public.slicers (dashboard_id, dataset_id, field, values_json, tipo)
                   values (%s, %s, %s, %s, %s) returning id""",
                (dbid, str(dataset_id).strip(), str(field).strip(), values_json or [], str(tipo).strip()),
            ).fetchone()
            conn.commit()
            sid = int(linha["id"])
        return obter_slicer(sid, db_url=db_url)  # type: ignore[return-value]
    finally:
        conn.close()


def deletar_slicer(sid: int, db_url=None) -> bool:
    conn = _conn(db_url)
    try:
        if _sqlite(db_url):
            cursor = conn.execute("delete from slicers where id = ?", (sid,))
        else:
            cursor = conn.execute("delete from public.slicers where id = %s", (sid,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()
