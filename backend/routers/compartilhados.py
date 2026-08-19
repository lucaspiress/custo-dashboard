from fastapi import APIRouter, Depends

import dashboards_store
from deps import usuario_atual

router = APIRouter(prefix="/api", tags=["compartilhados"])


@router.get("/dashboards/compartilhados")
def listar(usuario: dict = Depends(usuario_atual)) -> list[dict]:
    """Lista dashboards com eh_interno=true (todos os usuários logados veem)."""
    return dashboards_store.listar_internos()
