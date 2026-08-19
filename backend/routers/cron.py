import os
from datetime import datetime

from fastapi import APIRouter, Header, HTTPException

import agendamentos_store
import dashboards_store
import pdf_generator
import publicacoes_store
import r2_client
import relatorios_store
from routers.dashboards import _executar_widget

router = APIRouter(prefix="/api", tags=["cron"])


@router.post("/cron/relatorios")
def processar_agendamentos(authorization: str = Header(...)) -> dict:
    """Chamado pelo Vercel Cron. Autenticado por header Authorization: Bearer CRON_SECRET."""
    expected = f"Bearer {os.environ.get('CRON_SECRET', '')}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")

    pendentes = agendamentos_store.listar_pendentes()
    processados = 0
    for agendamento in pendentes:
        try:
            publicacao = publicacoes_store.obter(int(agendamento["publicacao_id"]))
            if publicacao is None:
                continue
            dashboard = dashboards_store.obter_dashboard_por_id(int(publicacao["dashboard_id"]))
            if dashboard is None:
                continue
            widgets_data = []
            for w in dashboard["widgets"]:
                try:
                    data = _executar_widget(w, [])
                except ValueError:
                    data = {}
                widgets_data.append({"widget": w, "data": data})
            pdf_bytes = pdf_generator.gerar_pdf_dashboard(dashboard, widgets_data)
            storage_key = f"relatorios/dashboard-{dashboard['id']}/{datetime.now().isoformat()}.pdf"
            r2_client.upload_pdf(storage_key, pdf_bytes)
            relatorios_store.criar(int(publicacao["id"]), int(agendamento["id"]), storage_key, len(pdf_bytes))
            nova_proxima = agendamentos_store.calcular_proxima_execucao(agendamento["periodicidade"])
            agendamentos_store.atualizar(int(agendamento["id"]), proxima_execucao=nova_proxima)
            processados += 1
        except Exception:
            relatorios_store.criar(
                int(agendamento["publicacao_id"]), int(agendamento["id"]), "", 0, status="falha"
            )
    return {"processados": processados}
