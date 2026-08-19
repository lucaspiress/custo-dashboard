from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

import dashboards_store
import publicacoes_store
from routers.dashboards import _executar_widget

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(tags=["publico"])


@router.get("/p/{token}")
@limiter.limit("60/minute")
def render_publico(request: Request, token: str) -> dict:
    """Renderiza dashboard publicado. Sem login. Rate limit 60 req/min/IP."""
    publicacao = publicacoes_store.obter_por_token(token)
    if not publicacao:
        raise HTTPException(status_code=404, detail="Link inválido ou revogado.")
    dashboard = dashboards_store.obter_dashboard_por_id(int(publicacao["dashboard_id"]))
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard não encontrado.")
    widgets_out = []
    for w in dashboard["widgets"]:
        try:
            data = _executar_widget(w, [])
        except ValueError:
            data = {}
        widgets_out.append({"widget_id": int(w["id"]), "type": w["type"], "data": data})
    return {
        "dashboard": {"id": dashboard["id"], "nome": dashboard["nome"]},
        "widgets": widgets_out,
    }
