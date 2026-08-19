from fastapi import APIRouter, Depends

import audit_store
from deps import usuario_atual

router = APIRouter(prefix="/api", tags=["audit-log"])


@router.get("/audit-log")
def listar(evento: str | None = None, limit: int = 100, offset: int = 0,
           usuario: dict = Depends(usuario_atual)) -> list[dict]:
    return audit_store.listar(evento=evento, limit=limit, offset=offset)
