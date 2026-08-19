from fastapi import APIRouter, Depends, HTTPException

import dashboards_store
import publicacoes_store
from deps import usuario_atual

router = APIRouter(prefix="/api", tags=["publicacoes"])


def _dashboard_ou_404(dbid: int, usuario: dict) -> dict:
    dashboard = dashboards_store.obter_dashboard_por_id(dbid)
    if dashboard is None:
        raise HTTPException(status_code=404, detail="Dashboard não encontrado.")
    return dashboard


@router.post("/dashboards/{dbid}/publicar")
def publicar(dbid: int, usuario: dict = Depends(usuario_atual)) -> dict:
    _dashboard_ou_404(dbid, usuario)
    publicacao = publicacoes_store.criar(dbid, usuario["id"])
    return {"token": publicacao["token"], "url_publica": f"/p/{publicacao['token']}"}


@router.get("/publicacoes/{pid}")
def obter(pid: int, usuario: dict = Depends(usuario_atual)) -> dict:
    publicacao = publicacoes_store.obter(pid)
    if publicacao is None:
        raise HTTPException(status_code=404, detail="Publicação não encontrada.")
    # não expõe o token em plain
    return {
        "id": publicacao["id"],
        "dashboard_id": publicacao["dashboard_id"],
        "revogado_em": publicacao.get("revogado_em"),
        "criado_em": publicacao.get("criado_em"),
        "criado_por": publicacao.get("criado_por"),
    }


@router.delete("/publicacoes/{pid}", status_code=204)
def revogar(pid: int, usuario: dict = Depends(usuario_atual)) -> None:
    if not publicacoes_store.revogar(pid):
        raise HTTPException(status_code=404, detail="Publicação não encontrada ou já revogada.")
