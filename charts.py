import plotly.graph_objects as go

import analysis
import loader
import theme


def _layout(titulo: str, altura: int, x_titulo: str | None = None, y_titulo: str | None = None) -> dict:
    return dict(
        template="plotly_white",
        title=dict(text=titulo, font=dict(size=15, color=theme.COR["tinta"], family=theme.FONTE_UI)),
        paper_bgcolor=theme.COR["superficie"],
        plot_bgcolor=theme.COR["superficie"],
        font=dict(family=theme.FONTE_UI, color=theme.COR["mutado"], size=12),
        xaxis=dict(title=x_titulo, gridcolor=theme.COR["grid"], zeroline=False),
        yaxis=dict(title=y_titulo, gridcolor=theme.COR["grid"], zeroline=False),
        height=altura,
        margin=dict(l=10, r=10, t=44, b=10),
        legend=dict(orientation="h", yanchor="bottom", y=1.01, x=0),
    )


def grafico_payback(local: loader.Local) -> go.Figure:
    fig = go.Figure()
    curva = analysis.curva_payback(local)
    if not curva:
        fig.update_layout(**_layout(f"Curva de payback — {local.nome}", 420))
        fig.add_annotation(
            text="Saldo mensal zerado ou negativo — payback inviável",
            showarrow=False,
            font=dict(color=theme.COR["alerta"], size=13),
        )
        return fig
    alvo = local.investimento - local.taxa_instalacao
    fig.add_trace(
        go.Scatter(
            x=[ponto["mes"] for ponto in curva],
            y=[ponto["saldo_acumulado"] for ponto in curva],
            mode="lines+markers",
            name="Saldo acumulado",
            line=dict(color=theme.COR["primaria"], width=3),
            marker=dict(size=6, color=theme.COR["primaria"]),
        )
    )
    fig.add_hline(
        y=alvo,
        line_dash="dash",
        line_color=theme.COR["alerta"],
        annotation_text=f"Investimento: R$ {alvo:,.2f}",
        annotation_position="top right",
        annotation_font=dict(color=theme.COR["alerta"], size=11),
    )
    meses = curva[-1]["mes"]
    fig.add_vline(
        x=meses,
        line_dash="dot",
        line_color=theme.COR["sucesso"],
        annotation_text=f"Payback: {meses} meses",
        annotation_position="top left",
        annotation_font=dict(color=theme.COR["sucesso"], size=11),
    )
    fig.update_layout(
        **_layout(f"Curva de payback — {local.nome}", 420, x_titulo="Meses", y_titulo="Saldo acumulado (R$)")
    )
    return fig


def grafico_pareto(local: loader.Local, n: int = 15) -> go.Figure:
    dados = analysis.pareto(local, n)
    fig = go.Figure()
    if not dados:
        return fig
    nomes = [d["material"][:40] for d in dados]
    fig.add_trace(
        go.Bar(
            x=nomes,
            y=[d["valor"] for d in dados],
            name="Valor",
            marker_color=theme.COR["primaria"],
        )
    )
    fig.add_trace(
        go.Scatter(
            x=nomes,
            y=[d["pct_acumulado"] for d in dados],
            name="% acumulado",
            yaxis="y2",
            mode="lines+markers",
            line=dict(color=theme.COR["destaque"], width=2),
            marker=dict(size=6, color=theme.COR["destaque"]),
        )
    )
    fig.update_layout(
        **_layout(f"Top {len(dados)} itens por valor — {local.nome}", 450, y_titulo="R$")
    )
    fig.update_layout(
        yaxis2=dict(
            title="% acumulado",
            overlaying="y",
            side="right",
            range=[0, 105],
            gridcolor=theme.COR["grid"],
            zeroline=False,
        ),
        xaxis_tickangle=-45,
        xaxis=dict(title=None, tickfont=dict(size=10)),
    )
    return fig


def grafico_composicao_investimento(local: loader.Local) -> go.Figure:
    dados = analysis.composicao_investimento(local)
    fig = go.Figure(
        go.Pie(
            labels=[d["nome"] for d in dados],
            values=[d["valor"] for d in dados],
            hole=0.45,
            marker_colors=[theme.COR["primaria"], theme.COR["destaque"]],
            textinfo="label+percent",
            textfont=dict(color="#ffffff", size=13),
            marker=dict(line=dict(color=theme.COR["superficie"], width=2)),
        )
    )
    fig.update_layout(**_layout("Composição do investimento", 380))
    fig.update_layout(showlegend=False)
    return fig


def grafico_categorias(local: loader.Local) -> go.Figure:
    dados = analysis.por_categoria(local)
    fig = go.Figure(
        go.Pie(
            labels=[d["categoria"] for d in dados],
            values=[d["valor"] for d in dados],
            hole=0.45,
            marker_colors=theme.PALETA_GRAFICOS[: len(dados)],
            textinfo="label+percent",
            textfont=dict(color="#ffffff", size=13),
            marker=dict(line=dict(color=theme.COR["superficie"], width=2)),
        )
    )
    fig.update_layout(**_layout("Custo de equipamento por categoria", 380))
    fig.update_layout(showlegend=False)
    return fig


def grafico_historico(df, metrica: str, titulo: str) -> go.Figure:
    fig = go.Figure()
    cores = theme.PALETA_GRAFICOS
    for indice, nome_local in enumerate(sorted(df["local"].unique())):
        dados = df[df["local"] == nome_local]
        fig.add_trace(
            go.Scatter(
                x=dados["uploaded_at"],
                y=dados[metrica],
                mode="lines+markers",
                name=nome_local,
                line=dict(width=2.5, color=cores[indice % len(cores)]),
                marker=dict(size=6, color=cores[indice % len(cores)]),
            )
        )
    fig.update_layout(
        **_layout(
            titulo,
            420,
            x_titulo="Data do upload",
            y_titulo="Meses" if "retorno" in metrica else "R$",
        )
    )
    return fig
