import re
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

import export
import loader
import report
import serialize
import store
from deps import usuario_atual

router = APIRouter(prefix="/uploads", tags=["files"])


def _carregar(usuario: dict, upload_id: int) -> loader.WorkbookData:
    try:
        return store.load_workbook(usuario["id"], upload_id)
    except ValueError as erro:
        raise HTTPException(status_code=404, detail=str(erro))


def _nome_arquivo(nome: str) -> str:
    base = re.sub(r"[^A-Za-z0-9_-]+", "_", nome.rsplit(".", 1)[0]).strip("_") or "Projeto"
    return quote(f"{base}")


@router.get("/{upload_id}/report")
def relatorio(upload_id: int, usuario: dict = Depends(usuario_atual)) -> Response:
    workbook = _carregar(usuario, upload_id)
    uploads = store.list_uploads(usuario["id"])
    nome_snapshot = "planilha.xlsx"
    uploaded_at = None
    for u in uploads:
        if int(u["id"]) == upload_id:
            nome_snapshot = u["filename"]
            uploaded_at = u["uploaded_at"]
            break
    pdf_bytes = report.gerar_pdf(nome_snapshot, workbook.locais, str(uploaded_at) if uploaded_at else None)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''Dashboard_Financeiro_{_nome_arquivo(nome_snapshot)}.pdf"
        },
    )


@router.get("/{upload_id}/export")
def exportar(upload_id: int, usuario: dict = Depends(usuario_atual)) -> Response:
    workbook = _carregar(usuario, upload_id)
    uploads = store.list_uploads(usuario["id"])
    nome_snapshot = "planilha.xlsx"
    for u in uploads:
        if int(u["id"]) == upload_id:
            nome_snapshot = u["filename"]
            break
    buffer = export.exportar_excel(workbook.locais)
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''Custos_{_nome_arquivo(nome_snapshot)}.xlsx"
        },
    )
