"""Geração de PDF tabular de dashboard via reportlab (Fase 1 — sem gráficos visuais)."""

import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _tabela_widget(data: dict):
    colunas = data.get("colunas") or []
    linhas = data.get("linhas") or []
    dados = [colunas]
    for linha in linhas:
        dados.append([linha.get(c, "") for c in colunas])
    if not dados:
        return None
    tabela = Table(dados)
    tabela.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    return tabela


def gerar_pdf_dashboard(dashboard: dict, widgets_data: list[dict]) -> bytes:
    """Gera PDF tabular do dashboard. Retorna bytes."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    estilos = getSampleStyleSheet()
    elementos = []

    nome = dashboard.get("nome", "Dashboard")
    elementos.append(Paragraph(nome, estilos["Title"]))
    elementos.append(Paragraph(f"Projeto: {dashboard.get('projeto_id', '')}", estilos["Normal"]))
    elementos.append(Paragraph(f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}", estilos["Normal"]))
    elementos.append(Spacer(1, 6 * mm))

    for item in widgets_data:
        widget = item.get("widget") or {}
        data = item.get("data") or {}
        wtype = widget.get("type", "table")
        elementos.append(Spacer(1, 4 * mm))
        elementos.append(Paragraph(f"Widget: {widget.get('id', '')} ({wtype})", estilos["Heading2"]))

        if wtype == "kpi":
            valor = data.get("value", 0)
            label = data.get("label", "Total")
            elementos.append(Paragraph(f"{label}: {valor}", estilos["Heading1"]))
        elif wtype in ("table", "pivot"):
            tabela = _tabela_widget(data)
            if tabela:
                elementos.append(tabela)
        else:  # bar/line/pie/area — tabela com os dados
            x = data.get("x") or []
            series = data.get("series") or []
            if series:
                nome_serie = series[0].get("name", "valor")
                dados = [["Categoria", nome_serie]]
                for i, cat in enumerate(x):
                    dados.append([cat, series[0].get("data", [])[i] if i < len(series[0].get("data", [])) else ""])
                tabela = Table(dados)
                tabela.setStyle(
                    TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
                            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                            ("FONTSIZE", (0, 0), (-1, -1), 8),
                        ]
                    )
                )
                elementos.append(tabela)

    doc.build(elementos)
    return buffer.getvalue()
