from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

import audit_store
import r2_client
import relatorios_store
from deps import usuario_atual

router = APIRouter(prefix="/api", tags=["relatorios"])


@router.get("/relatorios")
def listar(usuario: dict = Depends(usuario_atual)) -> list[dict]:
    return relatorios_store.listar()


@router.get("/relatorios/{rid}/download")
def download(rid: int, usuario: dict = Depends(usuario_atual)) -> Response:
    relatorio = relatorios_store.obter(rid)
    if relatorio is None:
        raise HTTPException(status_code=404, detail="Relatório não encontrado.")
    try:
        conteudo = r2_client.download_pdf(relatorio["storage_key"])
    except Exception as erro:
        raise HTTPException(status_code=502, detail=f"Erro ao baixar do armazenamento: {erro}")
    audit_store.registrar("download_relatorio", usuario["id"], rid, "relatorio", None)
    return Response(
        content=conteudo,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=relatorio_{rid}.pdf"},
    )
