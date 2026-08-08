import re
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

import powerbi_export
import report
import serialize
from deps import usuario_atual

router = APIRouter(prefix="/uploads", tags=["files"])


def _nome_arquivo(nome: str) -> str:
    base = re.sub(r"[^A-Za-z0-9_-]+", "_", nome.rsplit(".", 1)[0]).strip("_") or "Projeto"
    return quote(f"{base}")


@router.post("/report")
def relatorio(payload: dict, usuario: dict = Depends(usuario_atual)) -> Response:
    if not payload.get("locais"):
        raise HTTPException(status_code=400, detail="Nenhum dado de análise para gerar o relatório.")
    try:
        workbook = serialize.workbook_from_payload(payload)
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))
    nome_snapshot = payload.get("filename") or "planilha.xlsx"
    pdf_bytes = report.gerar_pdf(nome_snapshot, workbook.locais)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''Dashboard_Financeiro_{_nome_arquivo(nome_snapshot)}.pdf"
        },
    )


@router.post("/powerbi")
def powerbi(payload: dict, usuario: dict = Depends(usuario_atual)) -> Response:
    if not payload.get("locais"):
        raise HTTPException(status_code=400, detail="Nenhum dado de análise para exportar.")
    nome_snapshot = payload.get("filename") or "planilha.xlsx"
    try:
        pbix_bytes = powerbi_export.gerar_powerbi(payload)
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))
    except Exception as erro:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar o Power BI: {erro}")
    return Response(
        content=pbix_bytes,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''Analise_{_nome_arquivo(nome_snapshot)}.pbix"
        },
    )
