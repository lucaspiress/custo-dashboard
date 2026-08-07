import plotly.graph_objects as go

import analysis
import loader
import theme


def _fmt_br(valor: float, casas: int = 2) -> str:
    texto = f"{valor:,.{casas}f}".replace(",", "§").replace(".", ",").replace("§", ".")
    return f"R$ {texto}" if casas else texto


def _layout(titulo: str, altura: int, x_titulo: str | None = None, y_titulo: str | None = None) -> dict:
    return dict(
        template="plotly_white",
        title=dict(text=titulo, font=dict(size=15, color=theme.COR["tinta"], family=theme.FONTE_UI)),
        paper_bgcolor=theme.COR["superficie"],
        plot_bgcolor=theme.COR["superficie"],
        font=dict(family=theme.FONTE_UI, color=theme.COR["mutado"], size=12),
        xaxis=dict(title=x_titulo, gridcolor=theme.COR["grid"], zeroline=False, tickfont=dict(size=11)),
        yaxis=dict(title=y_titulo, gridcolor=theme.COR["grid"], zeroline=False, tickfont=dict(size=11)),
        height=altura,
        margin=dict(l=10, r=10, t=44, b=10),
        hoverlabel=dict(bgcolor="#0F172A", font=dict(color="#ffffff", family=theme.FONTE_UI, size=12)),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, x=0, font=dict(size=11)),
    )


def grafico_payback(local: loader.Local) -> go.Figure:
    fig = go.Figure()
    curva = analysis.curva_payback(local)
    if not curva:
        fig.update_layout(**_layout(f"Curva de payback — {local.nome}", 440))
        fig.add_annotation(
            text="Saldo mensal zerado ou negativo — payback inviável",
            showarrow=False,
            font=dict(color=theme.COR["alerta"], size=13),
        )
        return fig
    alvo = local.investimento - local.taxa_instalacao
    meses = [ponto["mes"] for ponto in curva]
    acumulado = [ponto["saldo_acumulado"] for ponto in curva]
    custom = [[_fmt_br(v)] for v in acumulado]
    fig.add_trace(
        go.Scatter(
            x=meses,
            y=acumulado,
            mode="lines+markers",
            name="Saldo acumulado",
            line=dict(color=theme.COR["primaria"], width=3, shape="spline"),
            fill="tozeroy",
            fillcolor="rgba(30, 64, 175, 0.07)",
            marker=dict(size=7, color=theme.COR["primaria"], line=dict(color="#ffffff", width=1.5)),
            customdata=custom,
            hovertemplate="Mês %{x}<br>Saldo acumulado: <b>%{customdata[0]}</b><extra></extra>",
        )
    )
    payback_mes = curva[-1]["mes"]
    fig.add_hline(
        y=alvo,
        line_dash="dash",
        line_color=theme.COR["alerta"],
        line_width=1.5,
        annotation_text=f"Investimento: {_fmt_br(alvo)}",
        annotation_position="top right",
        annotation_font=dict(color=theme.COR["alerta"], size=11.5),
    )
    fig.add_vline(
        x=payback_mes,
        line_dash="dot",
        line_color=theme.COR["sucesso"],
        line_width=1.5,
        annotation_text=f"Payback: {payback_mes} meses",
        annotation_position="top left",
        annotation_font=dict(color=theme.COR["sucesso"], size=11.5),
    )
    fig.add_trace(
        go.Scatter(
            x=[payback_mes],
            y=[acumulado[-1]],
            mode="markers",
            name="Payback",
            marker=dict(size=13, color=theme.COR["sucesso"], line=dict(color="#ffffff", width=2)),
            customdata=[[_fmt_br(acumulado[-1])]],
            hovertemplate="Payback: <b>%{x} meses</b><br>Acumulado: <b>%{customdata[0]}</b><extra></extra>",
        )
    )
    fig.update_layout(
        **_layout(f"Curva de payback — {local.nome}", 440, x_titulo="Meses", y_titulo="Saldo acumulado (R$)")
    )
    fig.update_yaxes(tickprefix="R$ ", separatethousands=True)
    return fig


def grafico_pareto(local: loader.Local, n: int = 15) -> go.Figure:
    dados = analysis.pareto(local, n)
    fig = go.Figure()
    if not dados:
        return fig
    itens_top = analysis.top_itens(local, n)
    categorias_ord = sorted({i.categoria for i in itens_top})
    cor_por_categoria = {
        cat: theme.PALETA_GRAFICOS[i % len(theme.PALETA_GRAFICOS)]
        for i, cat in enumerate(categorias_ord)
    }
    nomes = [d["material"][:45] for d in dados]
    valores = [d["valor"] for d in dados]
    pct_acum = [d["pct_acumulado"] for d in dados]
    custom_barras = [
        [itens_top[i].categoria, _fmt_br(valores[i]), f"{pct_acum[i]:.1f}%"]
        for i in range(len(dados))
    ]
    for cat in categorias_ord:
        fig.add_trace(
            go.Bar(x=[], y=[], name=cat, marker_color=cor_por_categoria[cat], legendgroup=cat)
        )
    fig.add_trace(
        go.Bar(
            x=nomes,
            y=valores,
            name="Valor",
            marker_color=[cor_por_categoria[i.categoria] for i in itens_top],
            marker_line=dict(color="#ffffff", width=0.8),
            showlegend=False,
            customdata=custom_barras,
            hovertemplate="<b>%{x}</b><br>Categoria: %{customdata[0]}<br>Valor: <b>%{customdata[1]}</b>"
            "<br>% acumulado: %{customdata[2]}<extra></extra>",
        )
    )
    fig.add_trace(
        go.Scatter(
            x=nomes,
            y=pct_acum,
            name="% acumulado",
            yaxis="y2",
            mode="lines+markers",
            line=dict(color=theme.COR["tinta"], width=2, dash="dot"),
            marker=dict(size=7, color=theme.COR["tinta"], line=dict(color="#ffffff", width=1)),
            customdata=[[f"{v:.1f}%"] for v in pct_acum],
            hovertemplate="% acumulado: <b>%{customdata[0]}</b><extra></extra>",
        )
    )
    fig.add_hline(
        y=80,
        line_dash="dash",
        line_color="#94A3B8",
        line_width=1,
        yref="y2",
        annotation_text="80% do custo",
        annotation_position="top right",
        annotation_font=dict(color="#94A3B8", size=10.5),
    )
    fig.update_layout(
        **_layout(f"Top {len(dados)} itens por valor — {local.nome}", 460, y_titulo="R$")
    )
    fig.update_layout(
        yaxis2=dict(
            title="% acumulado",
            overlaying="y",
            side="right",
            range=[0, 105],
            gridcolor=theme.COR["grid"],
            zeroline=False,
            tickfont=dict(size=11),
            ticksuffix="%",
        ),
        xaxis=dict(tickangle=-45, tickfont=dict(size=10), title=None),
        margin=dict(l=10, r=10, t=44, b=80),
    )
    fig.update_yaxes(tickprefix="R$ ", separatethousands=True)
    return fig


def _grafico_donut(labels: list[str], valores: list[float], titulo: str, cores: list[str]) -> go.Figure:
    total = sum(valores)
    fig = go.Figure(
        go.Pie(
            labels=labels,
            values=valores,
            hole=0.55,
            marker_colors=cores,
            textinfo="label+value",
            textfont=dict(color=theme.COR["tinta"], size=11.5),
            textposition="outside",
            marker=dict(line=dict(color=theme.COR["superficie"], width=2)),
            customdata=[[f"{v / total * 100:.1f}%"] for v in valores],
            hovertemplate="<b>%{label}</b><br>%{customdata[0]} — <b>%{value:,.2f}</b><extra></extra>",
            sort=False,
        )
    )
    fig.update_layout(
        **_layout(titulo, 400),
        showlegend=False,
        annotations=[
            dict(
                text=f"<b>{_fmt_br(total)}</b>",
                x=0.5,
                y=0.5,
                showarrow=False,
                font=dict(family=theme.FONTE_NUMERO, size=16, color=theme.COR["tinta"]),
            ),
            dict(
                text="TOTAL",
                x=0.5,
                y=0.43,
                showarrow=False,
                font=dict(family=theme.FONTE_UI, size=10, color=theme.COR["mutado"]),
            ),
        ],
    )
    return fig


def grafico_composicao_investimento(local: loader.Local) -> go.Figure:
    dados = analysis.composicao_investimento(local)
    return _grafico_donut(
        [d["nome"] for d in dados],
        [d["valor"] for d in dados],
        "Composição do investimento",
        [theme.COR["primaria"], theme.COR["destaque"]],
    )


def grafico_categorias(local: loader.Local) -> go.Figure:
    dados = analysis.por_categoria(local)
    return _grafico_donut(
        [d["categoria"] for d in dados],
        [d["valor"] for d in dados],
        "Custo de equipamento por categoria",
        theme.PALETA_GRAFICOS[: len(dados)],
    )


def grafico_historico(df, metrica: str, titulo: str) -> go.Figure:
    fig = go.Figure()
    cores = theme.PALETA_GRAFICOS
    e_meses = "retorno" in metrica
    for indice, nome_local in enumerate(sorted(df["local"].unique())):
        dados = df[df["local"] == nome_local]
        y = dados[metrica]
        custom = [[_fmt_br(v, 1) if not e_meses else f"{v:.1f} meses"] for v in y]
        fig.add_trace(
            go.Scatter(
                x=dados["uploaded_at"],
                y=y,
                mode="lines+markers",
                name=nome_local,
                line=dict(width=2.5, color=cores[indice % len(cores)], shape="spline"),
                fill="tozeroy",
                fillcolor="rgba(30, 64, 175, 0.04)",
                marker=dict(size=8, color=cores[indice % len(cores)], line=dict(color="#ffffff", width=1.5)),
                customdata=custom,
                hovertemplate="%{x|%d/%m/%Y %H:%M}<br>"
                + ("<b>%{customdata[0]}</b><extra></extra>" if e_meses else "<b>%{customdata[0]}</b><extra></extra>"),
            )
        )
    fig.update_layout(
        **_layout(
            titulo,
            420,
            x_titulo="Data do upload",
            y_titulo="Meses" if e_meses else "R$",
        )
    )
    fig.update_xaxes(tickformat="%d/%m/%Y")
    if not e_meses:
        fig.update_yaxes(tickprefix="R$ ", separatethousands=True)
    return fig
