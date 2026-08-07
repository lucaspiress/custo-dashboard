from datetime import datetime
from io import BytesIO

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

import analysis
import formatos
import insights
import loader

CORES = {"ok": "#16a34a", "atencao": "#d97706", "alerta": "#dc2626", "dica": "#2563eb"}
TITULOS = {"ok": "OK", "atencao": "Atenção", "alerta": "Alerta", "dica": "Dica"}

ESTILO_TITULO = ParagraphStyle(
    "titulo", fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=colors.HexColor("#111827")
)
ESTILO_SUBTITULO = ParagraphStyle(
    "subtitulo", fontName="Helvetica", fontSize=10, leading=14, textColor=colors.HexColor("#6b7280")
)
ESTILO_H2 = ParagraphStyle(
    "h2", fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=colors.HexColor("#111827"),
    spaceBefore=8, spaceAfter=4,
)
ESTILO_CORPO = ParagraphStyle(
    "corpo", fontName="Helvetica", fontSize=9.5, leading=13, textColor=colors.HexColor("#111827")
)


def _figura_payback(local: loader.Local) -> BytesIO:
    import math

    curva = analysis.curva_payback(local)
    fig, ax = plt.subplots(figsize=(5.4, 2.6))
    if not curva:
        ax.text(0.5, 0.5, "Payback inviável (saldo zerado/negativo)", ha="center", transform=ax.transAxes)
        ax.axis("off")
    else:
        alvo = local.investimento - local.taxa_instalacao
        ax.plot([p["mes"] for p in curva], [p["saldo_acumulado"] for p in curva], marker="o",
                color="#2563eb", linewidth=2)
        ax.axhline(alvo, color="#dc2626", linestyle="--", linewidth=1)
        ax.axvline(curva[-1]["mes"], color="#16a34a", linestyle=":", linewidth=1)
        ax.set_xlabel("Meses")
        ax.set_ylabel("R$")
        ax.grid(True, alpha=0.3)
        ax.set_title(f"Curva de payback — {curva[-1]['mes']} meses", fontsize=10)
    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    return buf


def _figura_donut(labels: list[str], valores: list[float], titulo: str, cores: list[str]) -> BytesIO:
    fig, ax = plt.subplots(figsize=(2.7, 2.4))
    ax.pie(valores, labels=labels, autopct="%1.0f%%", startangle=90,
           colors=cores, wedgeprops=dict(width=0.45))
    ax.set_title(titulo, fontsize=9)
    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    return buf


def _figura_pareto(local: loader.Local) -> BytesIO:
    dados = analysis.pareto(local, 10)
    fig, ax = plt.subplots(figsize=(5.4, 2.6))
    nomes = [d["material"][:35] for d in dados]
    ax.bar(nomes, [d["valor"] for d in dados], color="#2563eb")
    ax2 = ax.twinx()
    ax2.plot(nomes, [d["pct_acumulado"] for d in dados], color="#dc2626",
             marker="o", linewidth=1.5)
    ax2.set_ylim(0, 105)
    ax.set_ylabel("R$")
    ax2.set_ylabel("% acumulado")
    ax.tick_params(axis="x", rotation=45, labelsize=7)
    ax.grid(True, alpha=0.3, axis="y")
    ax.set_title("Top 10 itens por valor", fontsize=10)
    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    return buf


def _tabela(dados: list[list], larguras: list[float]) -> Table:
    tabela = Table(dados, colWidths=larguras, repeatRows=1)
    tabela.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563eb")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 8.5),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#e5e7eb")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f4f6")]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    return tabela


def gerar_pdf(filename: str, locais: list[loader.Local], uploaded_at: str | None = None) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=15 * mm, rightMargin=15 * mm, topMargin=15 * mm, bottomMargin=15 * mm,
    )
    elementos = []
    elementos.append(Paragraph("Custo Dashboard — Relatório de Análise", ESTILO_TITULO))
    gerado_em = datetime.now().strftime("%d/%m/%Y %H:%M")
    texto_sub = f"Arquivo: {filename}"
    if uploaded_at:
        texto_sub += f" &nbsp;|&nbsp; Upload: {uploaded_at}"
    texto_sub += f" &nbsp;|&nbsp; Gerado em: {gerado_em}"
    elementos.append(Paragraph(texto_sub, ESTILO_SUBTITULO))
    elementos.append(Spacer(1, 6 * mm))

    for indice, local in enumerate(locais):
        if indice > 0:
            elementos.append(PageBreak())
        elementos.append(Paragraph(local.nome, ESTILO_H2))

        resumo = analysis.resumo(local)
        kpis = [
            ["Receita mensal", formatos.fmt_moeda(resumo["valor_mensal"]),
             "Saldo mensal", formatos.fmt_moeda(resumo["saldo_mensal"])],
            ["Impostos (15%)", formatos.fmt_moeda(resumo["impostos"]),
             "Margem", f"{resumo['margem'] * 100:.1f}%" if resumo["margem"] is not None else "—"],
            ["Custos fixos mensais", formatos.fmt_moeda(local.custos_fixos),
             "Mão de obra", formatos.fmt_moeda(resumo["mao_de_obra"])],
            ["Equipamento", formatos.fmt_moeda(resumo["equipamento"]),
             "Investimento", formatos.fmt_moeda(resumo["investimento"])],
            ["Tempo de retorno", f"{formatos.fmt_numero(resumo['tempo_retorno'])} meses",
             "Itens", str(resumo["num_itens"])],
            ["Instalação", local.data_inst.strftime("%d/%m/%Y") if local.data_inst else "—",
             "Receita anual", formatos.fmt_moeda(resumo["receita_anual"])],
        ]
        elementos.append(_tabela(kpis, [42 * mm, 52 * mm, 42 * mm, 52 * mm]))
        elementos.append(Spacer(1, 4 * mm))

        if local.itens:
            dados_imagens = [Image(_figura_payback(local), width=92 * mm, height=45 * mm)]
            categorias = analysis.por_categoria(local)
            if len(categorias) > 1:
                cores_cat = ["#2563eb", "#f59e0b", "#16a34a", "#dc2626", "#8b5cf6"]
                dados_imagens.append(
                    Image(
                        _figura_donut(
                            [c["categoria"] for c in categorias],
                            [c["valor"] for c in categorias],
                            "Equipamento por categoria",
                            cores_cat[: len(categorias)],
                        ),
                        width=45 * mm,
                        height=42 * mm,
                    )
                )
            else:
                dados_imagens.append(Spacer(1, 20 * mm))
            elementos.append(Table([dados_imagens], colWidths=[97 * mm, 62 * mm]))
            elementos.append(Spacer(1, 2 * mm))
            elementos.append(Image(_figura_pareto(local), width=159 * mm, height=77 * mm))
            elementos.append(Spacer(1, 4 * mm))

            elementos.append(Paragraph("Top itens de equipamento", ESTILO_H2))
            linhas = [["Categoria", "Material", "Qtd", "Valor unit.", "Valor total"]]
            for item in analysis.top_itens(local, 15):
                linhas.append(
                    [
                        item.categoria,
                        item.material[:60],
                        formatos.fmt_numero(item.qtd, 0),
                        formatos.fmt_moeda(item.valor_unit),
                        formatos.fmt_moeda(item.valor_total),
                    ]
                )
            elementos.append(_tabela(linhas, [22 * mm, 76 * mm, 13 * mm, 24 * mm, 24 * mm]))
            elementos.append(Spacer(1, 4 * mm))

        elementos.append(Paragraph("Insights", ESTILO_H2))
        for insight in insights.gerar_insights(local):
            cor = CORES[insight["severidade"]]
            rotulo = TITULOS[insight["severidade"]]
            elementos.append(
                Paragraph(
                    f"<font color='{cor}'><b>{rotulo}</b></font> — {insight['texto']}",
                    ESTILO_CORPO,
                )
            )

    doc.build(elementos)
    return buffer.getvalue()
