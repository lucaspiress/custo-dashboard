import plotly.graph_objects as go

import analysis
import loader


def grafico_payback(local: loader.Local) -> go.Figure:
    fig = go.Figure()
    curva = analysis.curva_payback(local)
    if not curva:
        fig.add_annotation(text="Saldo mensal zerado ou negativo — payback inviável", showarrow=False)
        fig.update_layout(template="plotly_white")
        return fig
    alvo = local.investimento - local.taxa_instalacao
    fig.add_trace(
        go.Scatter(
            x=[ponto["mes"] for ponto in curva],
            y=[ponto["saldo_acumulado"] for ponto in curva],
            mode="lines+markers",
            name="Saldo acumulado",
            line=dict(color="#2563eb", width=3),
        )
    )
    fig.add_hline(
        y=alvo,
        line_dash="dash",
        line_color="#dc2626",
        annotation_text=f"Investimento: R$ {alvo:,.2f}",
        annotation_position="top right",
    )
    meses = curva[-1]["mes"]
    fig.add_vline(
        x=meses,
        line_dash="dot",
        line_color="#16a34a",
        annotation_text=f"Payback: {meses} meses",
        annotation_position="top left",
    )
    fig.update_layout(
        template="plotly_white",
        title=f"Curva de payback — {local.nome}",
        xaxis_title="Meses",
        yaxis_title="R$",
        height=420,
    )
    return fig


def grafico_pareto(local: loader.Local, n: int = 15) -> go.Figure:
    dados = analysis.pareto(local, n)
    if not dados:
        return go.Figure()
    nomes = [d["material"][:40] for d in dados]
    fig = go.Figure()
    fig.add_trace(
        go.Bar(
            x=nomes,
            y=[d["valor"] for d in dados],
            name="Valor",
            marker_color="#2563eb",
        )
    )
    fig.add_trace(
        go.Scatter(
            x=nomes,
            y=[d["pct_acumulado"] for d in dados],
            name="% acumulado",
            yaxis="y2",
            mode="lines+markers",
            line=dict(color="#dc2626", width=2),
        )
    )
    fig.update_layout(
        template="plotly_white",
        title=f"Top {len(dados)} itens por valor — {local.nome}",
        xaxis_title="Item",
        yaxis_title="R$",
        yaxis2=dict(title="% acumulado", overlaying="y", side="right", range=[0, 105]),
        height=450,
        xaxis_tickangle=-45,
    )
    return fig


def grafico_composicao_investimento(local: loader.Local) -> go.Figure:
    dados = analysis.composicao_investimento(local)
    fig = go.Figure(
        go.Pie(
            labels=[d["nome"] for d in dados],
            values=[d["valor"] for d in dados],
            hole=0.45,
            marker_colors=["#2563eb", "#f59e0b"],
            textinfo="label+percent",
        )
    )
    fig.update_layout(template="plotly_white", title="Composição do investimento", height=380)
    return fig


def grafico_categorias(local: loader.Local) -> go.Figure:
    dados = analysis.por_categoria(local)
    fig = go.Figure(
        go.Pie(
            labels=[d["categoria"] for d in dados],
            values=[d["valor"] for d in dados],
            hole=0.45,
            textinfo="label+percent",
        )
    )
    fig.update_layout(template="plotly_white", title="Custo de equipamento por categoria", height=380)
    return fig


def grafico_historico(df, metrica: str, titulo: str) -> go.Figure:
    fig = go.Figure()
    for nome_local in sorted(df["local"].unique()):
        dados = df[df["local"] == nome_local]
        fig.add_trace(
            go.Scatter(
                x=dados["uploaded_at"],
                y=dados[metrica],
                mode="lines+markers",
                name=nome_local,
            )
        )
    fig.update_layout(
        template="plotly_white",
        title=titulo,
        xaxis_title="Data do upload",
        yaxis_title="R$" if "retorno" not in metrica else "Meses",
        height=420,
    )
    return fig
