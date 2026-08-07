from datetime import datetime
from io import BytesIO

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from reportlab.lib import colors as rl_colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as rl_canvas
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
import theme

FONTE_UI = "SegoeUI"
FONTE_UI_B = "SegoeUI-Bold"
FONTE_UI_L = "SegoeUI-Light"
FONTE_NUM = "Consolas"

pdfmetrics.registerFont(TTFont(FONTE_UI, r"C:\Windows\Fonts\segoeui.ttf"))
pdfmetrics.registerFont(TTFont(FONTE_UI_B, r"C:\Windows\Fonts\segoeuib.ttf"))
pdfmetrics.registerFont(TTFont(FONTE_UI_L, r"C:\Windows\Fonts\segoeuisl.ttf"))
pdfmetrics.registerFont(TTFont(FONTE_NUM, r"C:\Windows\Fonts\consola.ttf"))

ESTILO_TITULO = ParagraphStyle(
    "titulo", fontName=FONTE_UI_B, fontSize=19, leading=23, textColor=rl_colors.HexColor(theme.COR["tinta"])
)
ESTILO_SUBTITULO = ParagraphStyle(
    "subtitulo", fontName=FONTE_UI, fontSize=9.5, leading=13, textColor=rl_colors.HexColor(theme.COR["mutado"])
)
ESTILO_H2 = ParagraphStyle(
    "h2", fontName=FONTE_UI_B, fontSize=12.5, leading=16, textColor=rl_colors.HexColor("#ffffff"),
)
ESTILO_CORPO = ParagraphStyle(
    "corpo", fontName=FONTE_UI, fontSize=9.5, leading=13.5, textColor=rl_colors.HexColor(theme.COR["tinta"])
)
ESTILO_TABELA_CELULA = ParagraphStyle(
    "celula", fontName=FONTE_UI, fontSize=8, leading=10.5, textColor=rl_colors.HexColor(theme.COR["tinta"])
)
ESTILO_TABELA_NUM = ParagraphStyle(
    "num", fontName=FONTE_NUM, fontSize=8, leading=10.5, textColor=rl_colors.HexColor(theme.COR["tinta"]),
    alignment=2,
)
ESTILO_TABELA_CAB = ParagraphStyle(
    "cab", fontName=FONTE_UI_B, fontSize=8, leading=10.5, textColor=rl_colors.white
)


ESTILO_TITULO_ITEM = ParagraphStyle(
    "item", fontName=FONTE_UI_B, fontSize=11, leading=14, textColor=rl_colors.HexColor(theme.COR["tinta"]),
    spaceBefore=2, spaceAfter=3,
)


def _pagina(canvas: rl_canvas.Canvas, doc) -> None:
    canvas.saveState()
    canvas.setFillColor(rl_colors.HexColor(theme.COR["primaria"]))
    canvas.rect(0, A4[1] - 5 * mm, A4[0], 5 * mm, stroke=0, fill=1)
    canvas.setStrokeColor(rl_colors.HexColor(theme.COR["borda"]))
    canvas.setLineWidth(0.6)
    canvas.line(15 * mm, 12 * mm, A4[0] - 15 * mm, 12 * mm)
    canvas.setFont(FONTE_UI, 7.5)
    canvas.setFillColor(rl_colors.HexColor(theme.COR["mutado"]))
    canvas.drawString(15 * mm, 8.2 * mm, "Custo Dashboard — relatório de análise de custos")
    canvas.drawRightString(A4[0] - 15 * mm, 8.2 * mm, f"Página {doc.page}")
    canvas.restoreState()


def _figura_payback(local: loader.Local) -> BytesIO:
    curva = analysis.curva_payback(local)
    fig, ax = plt.subplots(figsize=(5.2, 2.5))
    fig.patch.set_facecolor("white")
    if not curva:
        ax.text(0.5, 0.5, "Payback inviável (saldo zerado/negativo)", ha="center",
                transform=ax.transAxes, color=theme.COR["alerta"])
        ax.axis("off")
    else:
        alvo = local.investimento - local.taxa_instalacao
        ax.plot([p["mes"] for p in curva], [p["saldo_acumulado"] for p in curva],
                marker="o", color=theme.COR["primaria"], linewidth=2.2,
                markerfacecolor=theme.COR["primaria"], markersize=4)
        ax.axhline(alvo, color=theme.COR["alerta"], linestyle="--", linewidth=1)
        ax.axvline(curva[-1]["mes"], color=theme.COR["sucesso"], linestyle=":", linewidth=1)
        ax.set_xlabel("Meses", fontsize=8.5, color=theme.COR["mutado"])
        ax.set_ylabel("R$", fontsize=8.5, color=theme.COR["mutado"])
        ax.grid(True, alpha=0.3, color=theme.COR["grid"])
        ax.tick_params(labelsize=8)
        for sp in ax.spines.values():
            sp.set_color(theme.COR["borda"])
        ax.set_title(f"Curva de payback — {curva[-1]['mes']} meses", fontsize=9.5,
                     color=theme.COR["tinta"], pad=6)
    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=160, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return buf


def _figura_donut(labels: list[str], valores: list[float], titulo: str, cores: list[str]) -> BytesIO:
    fig, ax = plt.subplots(figsize=(2.6, 2.3))
    fig.patch.set_facecolor("white")
    ax.pie(valores, labels=labels, autopct="%1.0f%%", startangle=90, colors=cores,
           wedgeprops=dict(width=0.45, edgecolor="white", linewidth=2),
           textprops=dict(fontsize=8, color=theme.COR["tinta"]))
    ax.set_title(titulo, fontsize=9, color=theme.COR["tinta"], pad=6)
    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=160, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return buf


def _figura_pareto(local: loader.Local) -> BytesIO:
    dados = analysis.pareto(local, 10)
    fig, ax = plt.subplots(figsize=(5.2, 2.5))
    fig.patch.set_facecolor("white")
    nomes = [d["material"][:35] for d in dados]
    ax.bar(nomes, [d["valor"] for d in dados], color=theme.COR["primaria"], width=0.7)
    ax2 = ax.twinx()
    ax2.plot(nomes, [d["pct_acumulado"] for d in dados], color=theme.COR["destaque"],
             marker="o", linewidth=1.6, markersize=3.5)
    ax2.set_ylim(0, 105)
    ax.set_ylabel("R$", fontsize=8.5, color=theme.COR["mutado"])
    ax2.set_ylabel("% acumulado", fontsize=8.5, color=theme.COR["mutado"])
    ax.tick_params(axis="x", rotation=40, labelsize=6.5)
    ax.tick_params(labelsize=8)
    ax2.tick_params(labelsize=8)
    ax.grid(True, alpha=0.3, axis="y", color=theme.COR["grid"])
    for sp in ax.spines.values():
        sp.set_color(theme.COR["borda"])
    ax2.spines["right"].set_color(theme.COR["borda"])
    ax.set_title("Top 10 itens por valor", fontsize=9.5, color=theme.COR["tinta"], pad=6)
    buf = BytesIO()
    fig.savefig(buf, format="png", dpi=160, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return buf


def _tabela(dados: list[list], larguras: list[float], num_colunas: set[int] | None = None) -> Table:
    num_colunas = num_colunas or set()
    celulas = []
    for i, linha in enumerate(dados):
        nova = []
        for j, valor in enumerate(linha):
            estilo = ESTILO_TABELA_NUM if j in num_colunas and i > 0 else (ESTILO_TABELA_CAB if i == 0 else ESTILO_TABELA_CELULA)
            nova.append(Paragraph(str(valor), estilo))
        celulas.append(nova)
    tabela = Table(celulas, colWidths=larguras, repeatRows=1)
    tabela.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), rl_colors.HexColor(theme.COR["primaria"])),
                ("GRID", (0, 0), (-1, -1), 0.5, rl_colors.HexColor(theme.COR["borda"])),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [rl_colors.white, rl_colors.HexColor("#F1F5F9")]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 3.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return tabela


def _bloco_kpis(resumo: dict) -> list[Table]:
    tiles = [
        ("Receita mensal", resumo["valor_mensal"], theme.COR["primaria"]),
        ("Saldo mensal", resumo["saldo_mensal"], theme.COR["sucesso"]),
        ("Investimento", resumo["investimento"], theme.COR["destaque"]),
        ("Tempo de retorno", resumo["tempo_retorno"], theme.COR["alerta"]),
        ("Mão de obra", resumo["mao_de_obra"], "#64748B"),
        ("Equipamento", resumo["equipamento"], "#0EA5E9"),
        ("Margem", resumo["margem"], "#8B5CF6"),
        ("Impostos (15%)", resumo["impostos"], "#94A3B8"),
    ]
    blocos = []
    for inicio in range(0, len(tiles), 4):
        linha = []
        for rotulo, valor, cor in tiles[inicio:inicio + 4]:
            if isinstance(valor, (int, float)):
                texto_valor = formatos.fmt_moeda(valor)
                if rotulo in ("Tempo de retorno",):
                    texto_valor = f"{formatos.fmt_numero(valor)} meses"
                elif rotulo == "Margem":
                    texto_valor = f"{valor * 100:.1f}%"
            else:
                texto_valor = "—"
            celula = [
                [
                    Paragraph(
                        f'<font name="{FONTE_UI_B}" size="7" color="white">{rotulo.upper()}</font>',
                        ParagraphStyle("t", leading=9),
                    ),
                    Paragraph(
                        f'<font name="{FONTE_NUM}" size="10" color="white"><b>{texto_valor}</b></font>',
                        ParagraphStyle("v", leading=12),
                    ),
                ]
            ]
            celula_tabela = Table(celula, colWidths=[47 * mm])
            celula_tabela.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), rl_colors.HexColor(cor)),
                        ("TOPPADDING", (0, 0), (-1, -1), 5),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                        ("LEFTPADDING", (0, 0), (-1, -1), 7),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ]
                )
            )
            linha.append(celula_tabela)
        blocos.append(Table([linha], colWidths=[47 * mm] * len(linha)))
        blocos[-1].setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    return blocos


def gerar_pdf(filename: str, locais: list[loader.Local], uploaded_at: str | None = None) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=15 * mm, rightMargin=15 * mm, topMargin=22 * mm, bottomMargin=18 * mm,
        title="Custo Dashboard — Relatório de Análise",
        author="Custo Dashboard",
    )
    elementos = []
    elementos.append(Paragraph("Custo Dashboard — Relatório de Análise", ESTILO_TITULO))
    gerado_em = datetime.now().strftime("%d/%m/%Y às %H:%M")
    texto_sub = f"Arquivo: {filename}"
    if uploaded_at:
        texto_sub += f" &nbsp;|&nbsp; Upload: {uploaded_at}"
    texto_sub += f" &nbsp;|&nbsp; Gerado em: {gerado_em}"
    elementos.append(Paragraph(texto_sub, ESTILO_SUBTITULO))
    elementos.append(Spacer(1, 5 * mm))
    linha = Table([[Paragraph(f"Resumo executivo", ESTILO_H2)]], colWidths=[180 * mm])
    linha.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), rl_colors.HexColor(theme.COR["primaria"])),
                               ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                               ("LEFTPADDING", (0, 0), (-1, -1), 8)]))
    elementos.append(linha)
    elementos.append(Spacer(1, 3 * mm))

    for indice, local in enumerate(locais):
        if indice > 0:
            elementos.append(PageBreak())
        resumo = analysis.resumo(local)

        titulo_local = Table([[Paragraph(local.nome, ESTILO_H2)]], colWidths=[180 * mm])
        titulo_local.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), rl_colors.HexColor("#1E3A8A")),
                                          ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                                          ("LEFTPADDING", (0, 0), (-1, -1), 8)]))
        elementos.append(titulo_local)
        elementos.append(Spacer(1, 3 * mm))
        for bloco in _bloco_kpis(resumo):
            elementos.append(bloco)
            elementos.append(Spacer(1, 2.5 * mm))
        elementos.append(Spacer(1, 2 * mm))

        if local.itens:
            imagens = [Image(_figura_payback(local), width=92 * mm, height=44 * mm)]
            categorias = analysis.por_categoria(local)
            if len(categorias) > 1:
                imagens.append(
                    Image(
                        _figura_donut(
                            [c["categoria"] for c in categorias],
                            [c["valor"] for c in categorias],
                            "Equipamento por categoria",
                            theme.PALETA_GRAFICOS[: len(categorias)],
                        ),
                        width=45 * mm,
                        height=42 * mm,
                    )
                )
            else:
                imagens.append(Spacer(1, 20 * mm))
            elementos.append(Table([imagens], colWidths=[100 * mm, 60 * mm]))
            elementos.append(Spacer(1, 2 * mm))
            elementos.append(Image(_figura_pareto(local), width=159 * mm, height=77 * mm))
            elementos.append(Spacer(1, 4 * mm))

            elementos.append(Paragraph("Top itens de equipamento", ESTILO_TITULO_ITEM))
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
            elementos.append(_tabela(linhas, [22 * mm, 76 * mm, 13 * mm, 24 * mm, 24 * mm], num_colunas={2, 3, 4}))
            elementos.append(Spacer(1, 4 * mm))

        elementos.append(Paragraph("Insights", ESTILO_TITULO_ITEM))
        for insight in insights.gerar_insights(local):
            cor = theme.SEVERIDADE_COR[insight["severidade"]]
            rotulo = {"ok": "OK", "atencao": "Atenção", "alerta": "Alerta", "dica": "Dica"}[insight["severidade"]]
            elementos.append(
                Paragraph(
                    f"<font name='{FONTE_UI_B}' size='8' color='{cor}'>{rotulo.upper()}</font>"
                    f" &nbsp;{insight['texto']}",
                    ESTILO_CORPO,
                )
            )

    doc.build(elementos, onFirstPage=_pagina, onLaterPages=_pagina)
    return buffer.getvalue()
