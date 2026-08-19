from fastapi import APIRouter, Depends, HTTPException

import agregador
import dashboards_store
from deps import exigir_projeto, usuario_atual

router = APIRouter(prefix="/api", tags=["dashboards"])


def _dashboard_ou_404(dbid: int, usuario: dict) -> dict:
    dashboard = dashboards_store.obter_dashboard_por_id(dbid)
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard não encontrado.")
    exigir_projeto(usuario, int(dashboard["projeto_id"]))
    return dashboard


# ------------------------------------------------------------- dashboards

@router.get("/projetos/{projeto_id}/dashboards")
def listar(projeto_id: int, usuario: dict = Depends(usuario_atual)) -> list[dict]:
    exigir_projeto(usuario, projeto_id)
    return dashboards_store.listar_dashboards(projeto_id)


@router.post("/projetos/{projeto_id}/dashboards")
def criar(projeto_id: int, dados: dict, usuario: dict = Depends(usuario_atual)) -> dict:
    exigir_projeto(usuario, projeto_id)
    nome = str(dados.get("nome") or "").strip()
    if not nome:
        raise HTTPException(status_code=400, detail="Informe o nome do dashboard.")
    try:
        return dashboards_store.criar_dashboard(
            projeto_id,
            nome,
            layout_json=dados.get("layout_json"),
            eh_interno=bool(dados.get("eh_interno", False)),
        )
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))


@router.get("/projetos/{projeto_id}/dashboards/{dbid}")
def obter(projeto_id: int, dbid: int, usuario: dict = Depends(usuario_atual)) -> dict:
    exigir_projeto(usuario, projeto_id)
    dashboard = dashboards_store.obter_dashboard(dbid, projeto_id)
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard não encontrado.")
    return dashboard


@router.patch("/projetos/{projeto_id}/dashboards/{dbid}")
def atualizar(projeto_id: int, dbid: int, dados: dict, usuario: dict = Depends(usuario_atual)) -> dict:
    exigir_projeto(usuario, projeto_id)
    try:
        atualizado = dashboards_store.atualizar_dashboard(
            dbid,
            projeto_id,
            nome=dados.get("nome"),
            layout_json=dados.get("layout_json"),
            eh_interno=dados.get("eh_interno"),
        )
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))
    if atualizado is None:
        raise HTTPException(status_code=404, detail="Dashboard não encontrado.")
    return atualizado


@router.delete("/projetos/{projeto_id}/dashboards/{dbid}", status_code=204)
def excluir(projeto_id: int, dbid: int, usuario: dict = Depends(usuario_atual)) -> None:
    exigir_projeto(usuario, projeto_id)
    if not dashboards_store.deletar_dashboard(dbid, projeto_id):
        raise HTTPException(status_code=404, detail="Dashboard não encontrado.")


# ---------------------------------------------------------------- widgets

@router.post("/dashboards/{dbid}/widgets")
def adicionar_widget(dbid: int, dados: dict, usuario: dict = Depends(usuario_atual)) -> dict:
    dashboard = _dashboard_ou_404(dbid, usuario)
    try:
        return dashboards_store.adicionar_widget(
            dbid,
            int(dashboard["projeto_id"]),
            dados.get("type"),
            dados.get("dataset_id"),
            config_json=dados.get("config_json"),
            position_json=dados.get("position_json"),
        )
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))


@router.patch("/dashboards/{dbid}/widgets/{wid}")
def atualizar_widget(dbid: int, wid: int, dados: dict, usuario: dict = Depends(usuario_atual)) -> dict:
    _dashboard_ou_404(dbid, usuario)
    widget = dashboards_store.obter_widget(wid)
    if widget is None or int(widget["dashboard_id"]) != dbid:
        raise HTTPException(status_code=404, detail="Widget não encontrado.")
    try:
        atualizado = dashboards_store.atualizar_widget(
            wid,
            type=dados.get("type"),
            dataset_id=dados.get("dataset_id"),
            config_json=dados.get("config_json"),
            position_json=dados.get("position_json"),
            ordem=dados.get("ordem"),
        )
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))
    return atualizado or {}


@router.delete("/dashboards/{dbid}/widgets/{wid}", status_code=204)
def excluir_widget(dbid: int, wid: int, usuario: dict = Depends(usuario_atual)) -> None:
    _dashboard_ou_404(dbid, usuario)
    widget = dashboards_store.obter_widget(wid)
    if widget is None or int(widget["dashboard_id"]) != dbid:
        raise HTTPException(status_code=404, detail="Widget não encontrado.")
    dashboards_store.deletar_widget(wid)


# ---------------------------------------------------------------- slicers

@router.post("/dashboards/{dbid}/slicers")
def adicionar_slicer(dbid: int, dados: dict, usuario: dict = Depends(usuario_atual)) -> dict:
    _dashboard_ou_404(dbid, usuario)
    try:
        return dashboards_store.adicionar_slicer(
            dbid,
            dados.get("dataset_id"),
            dados.get("field"),
            dados.get("tipo"),
            values_json=dados.get("values_json"),
        )
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))


@router.delete("/dashboards/{dbid}/slicers/{sid}", status_code=204)
def excluir_slicer(dbid: int, sid: int, usuario: dict = Depends(usuario_atual)) -> None:
    _dashboard_ou_404(dbid, usuario)
    slicer = dashboards_store.obter_slicer(sid)
    if slicer is None or int(slicer["dashboard_id"]) != dbid:
        raise HTTPException(status_code=404, detail="Slicer não encontrado.")
    dashboards_store.deletar_slicer(sid)


# ------------------------------------------------------------------ query

def _dados_grafico(resultado: dict, config: dict) -> dict:
    groups = resultado["groups"]
    x = [str(g["key"].get(config.get("x"), "")) for g in groups]
    ys = config.get("y") or []
    nome = ys[0] if isinstance(ys, list) and ys else (config.get("field") or "")
    data = [g["value"] for g in groups]
    return {"x": x, "y": x, "series": [{"name": nome, "data": data}]}


def _dados_kpi(resultado: dict, config: dict) -> dict:
    return {"value": resultado["total"], "label": config.get("label") or config.get("field") or "Total"}


def _dados_tabela(resultado: dict, config: dict) -> dict:
    colunas = config.get("colunas") or []
    linhas = []
    for r in resultado["rows"]:
        linhas.append({c: r.get(c) for c in colunas})
    return {"colunas": colunas, "linhas": linhas}


def _dados_pivot(resultado: dict, config: dict) -> dict:
    metrica = config.get("metrica") or "valor"
    colunas = (config.get("linhas") or []) + [metrica]
    linhas = []
    for g in resultado["groups"]:
        linha = dict(g["key"])
        linha[metrica] = g["value"]
        linhas.append(linha)
    return {"colunas": colunas, "linhas": linhas}


def _executar_widget(widget: dict, slicers_ativos: list[dict]) -> dict:
    config = widget["config_json"] or {}
    dataset_id = widget["dataset_id"]
    wtype = widget["type"]
    if wtype in ("bar", "line", "area", "pie"):
        x = config.get("x")
        ys = config.get("y") or []
        field = ys[0] if isinstance(ys, list) and ys else config.get("field")
        aggregation = config.get("aggregation", "sum")
        resultado = agregador.agregar(
            dataset_id, group_by=[x] if x else None, aggregation=aggregation,
            field=field, slicers=slicers_ativos,
        )
        return _dados_grafico(resultado, config)
    if wtype == "kpi":
        resultado = agregador.agregar(
            dataset_id, group_by=None, aggregation=config.get("aggregation", "sum"),
            field=config.get("field"), slicers=slicers_ativos,
        )
        return _dados_kpi(resultado, config)
    if wtype == "pivot":
        resultado = agregador.agregar(
            dataset_id, group_by=config.get("linhas") or [], aggregation=config.get("aggregation", "sum"),
            field=config.get("metrica"), slicers=slicers_ativos,
        )
        return _dados_pivot(resultado, config)
    # table (default)
    resultado = agregador.agregar(dataset_id, group_by=None, aggregation=None, slicers=slicers_ativos)
    return _dados_tabela(resultado, config)


@router.post("/dashboards/{dbid}/query")
def query(dbid: int, dados: dict, usuario: dict = Depends(usuario_atual)) -> dict:
    _dashboard_ou_404(dbid, usuario)
    dashboard = dashboards_store.obter_dashboard_por_id(dbid)
    widgets = dashboard["widgets"]
    slicers = dashboard["slicers"]

    widget_ids = dados.get("widget_ids")
    if widget_ids:
        ids = {int(w) for w in widget_ids}
        widgets = [w for w in widgets if int(w["id"]) in ids]

    slicer_values = dados.get("slicer_values") or {}
    slicers_ativos = []
    for s in slicers:
        valores = slicer_values.get(str(s["id"]))
        if valores:
            slicers_ativos.append({"field": s["field"], "values": valores})

    slicers_out = []
    for s in slicers:
        try:
            options = agregador.listar_opcoes_slicer(s["dataset_id"], s["field"])
        except ValueError:
            options = []
        slicers_out.append({"slicer_id": int(s["id"]), "field": s["field"], "tipo": s["tipo"], "options": options})

    widgets_out = []
    for w in widgets:
        try:
            data = _executar_widget(w, slicers_ativos)
        except ValueError as erro:
            raise HTTPException(status_code=400, detail=str(erro))
        widgets_out.append({"widget_id": int(w["id"]), "type": w["type"], "data": data})

    return {"widgets": widgets_out, "slicers": slicers_out}
