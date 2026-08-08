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
        hoverlabel=dict(bgcolor=theme.COR["fundo"], font=dict(color="#ffffff", family=theme.FONTE_UI, size=12)),
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
            fillcolor="rgba(16, 160, 160, 0.10)",
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
        annotation_position="top left",
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
        **_layout(f"Curva de payback - {local.nome}", 440, x_titulo="Meses", y_titulo="Saldo acumulado (R$)")
    )
    fig.update_layout(showlegend=False)
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
    nomes = [d["material"][:58] for d in dados]
    valores = [d["valor"] for d in dados]
    pct_acum = [d["pct_acumulado"] for d in dados]
    nomes_rev = nomes[::-1]
    valores_rev = valores[::-1]
    itens_rev = itens_top[::-1]
    pct_rev = pct_acum[::-1]
    custom_barras = [
        [itens_rev[i].categoria, _fmt_br(valores_rev[i]), f"{pct_rev[i]:.1f}%"]
        for i in range(len(dados))
    ]
    for cat in categorias_ord:
        fig.add_trace(
            go.Bar(x=[], y=[], name=cat, marker_color=cor_por_categoria[cat], legendgroup=cat)
        )
    fig.add_trace(
        go.Bar(
            x=valores_rev,
            y=nomes_rev,
            orientation="h",
            name="Valor",
            marker_color=[cor_por_categoria[i.categoria] for i in itens_rev],
            marker_line=dict(color="#ffffff", width=0.8),
            showlegend=False,
            customdata=custom_barras,
            hovertemplate="<b>%{y}</b><br>Categoria: %{customdata[0]}<br>Valor: <b>%{customdata[1]}</b>"
            "<br>% acumulado: %{customdata[2]}<extra></extra>",
        )
    )
    fig.add_trace(
        go.Scatter(
            x=pct_rev,
            y=nomes_rev,
            xaxis="x2",
            name="% acumulado",
            mode="lines+markers",
            line=dict(color=theme.COR["tinta"], width=2, dash="dot"),
            marker=dict(size=7, color=theme.COR["tinta"], line=dict(color="#ffffff", width=1)),
            customdata=[[f"{v:.1f}%"] for v in pct_rev],
            hovertemplate="% acumulado: <b>%{customdata[0]}</b><extra></extra>",
        )
    )
    fig.add_shape(
        type="line",
        x0=80,
        x1=80,
        y0=-0.5,
        y1=len(nomes_rev) - 0.5,
        xref="x2",
        yref="y",
        line=dict(color="#94A3B8", width=1, dash="dash"),
    )
    fig.add_annotation(
        x=80,
        y=1.02,
        xref="x2",
        yref="paper",
        text="80% do custo",
        showarrow=False,
        font=dict(color="#64748B", size=10.5),
        xanchor="left",
    )
    fig.update_layout(
        **_layout(f"Top {len(dados)} itens por valor - {local.nome}", 500, x_titulo="Valor do item (R$)")
    )
    fig.update_layout(
        xaxis=dict(
            title="Valor do item (R$)",
            gridcolor=theme.COR["grid"],
            zeroline=False,
            tickfont=dict(size=11),
            tickprefix="R$ ",
            separatethousands=True,
        ),
        xaxis2=dict(
            title="% acumulado",
            overlaying="x",
            side="top",
            range=[0, 105],
            gridcolor="rgba(0,0,0,0)",
            zeroline=False,
            tickfont=dict(size=11),
            ticksuffix="%",
        ),
        yaxis=dict(
            categoryorder="array",
            categoryarray=nomes_rev,
            gridcolor=theme.COR["grid"],
            zeroline=False,
            tickfont=dict(size=10),
        ),
        margin=dict(l=10, r=10, t=76, b=22),
        showlegend=False,
    )
    return fig


def _grafico_donut(labels: list[str], valores: list[float], titulo: str, cores: list[str]) -> go.Figure:
    total = sum(valores)
    fig = go.Figure(
        go.Pie(
            labels=labels,
            values=valores,
            hole=0.55,
            marker_colors=cores,
            text=[_fmt_br(value) for value in valores],
            textinfo="none",
            texttemplate="%{label}<br>%{text}",
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


def grafico_historico(registros: list[dict], metrica: str, titulo: str) -> go.Figure:
    fig = go.Figure()
    cores = theme.PALETA_GRAFICOS
    e_meses = "retorno" in metrica
    locais = sorted({r["local"] for r in registros})
    for indice, nome_local in enumerate(locais):
        dados = [r for r in registros if r["local"] == nome_local]
        dados.sort(key=lambda r: r["uploaded_at"])
        y = [r[metrica] for r in dados]
        custom = [[_fmt_br(v, 1) if not e_meses else f"{v:.1f} meses"] for v in y]
        fig.add_trace(
            go.Scatter(
                x=[r["uploaded_at"] for r in dados],
                y=y,
                mode="lines+markers",
                name=nome_local,
                line=dict(width=2.5, color=cores[indice % len(cores)], shape="spline"),
                fill="tozeroy",
                fillcolor="rgba(16, 160, 160, 0.08)",
                marker=dict(size=8, color=cores[indice % len(cores)], line=dict(color="#ffffff", width=1.5)),
                customdata=custom,
                hovertemplate="%{x|%d/%m/%Y %H:%M}<br><b>%{customdata[0]}</b><extra></extra>",
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
    fig.update_xaxes(tickformat="%d/%m/%Y", type="date")
    if not e_meses:
        fig.update_yaxes(tickprefix="R$ ", separatethousands=True)
    return fig


def grafico_barras_comparativo(locais, metrica: str, titulo: str, e_meses: bool = False) -> go.Figure:
    fig = go.Figure()
    dados = [(analysis.resumo(local), local) for local in locais]
    dados.sort(key=lambda par: par[0][metrica], reverse=True)
    nomes = [r["local"] for r, _ in dados]
    valores = [r[metrica] for r, _ in dados]
    cores = [theme.COR["primaria"]] * len(nomes)
    for i, r in enumerate(dados):
        res, _ = r
        if metrica == "tempo_retorno":
            if res["tempo_retorno"] is None:
                cores[i] = theme.COR["alerta"]
            elif res["tempo_retorno"] > 24:
                cores[i] = theme.COR["alerta"]
            elif res["tempo_retorno"] > 12:
                cores[i] = theme.COR["destaque"]
            else:
                cores[i] = theme.COR["sucesso"]
    custom = [[_fmt_br(v, 1) if not e_meses else f"{v:.1f} meses"] for v in valores]
    fig.add_trace(
        go.Bar(
            x=valores,
            y=nomes,
            orientation="h",
            marker_color=cores,
            marker_line=dict(color="#ffffff", width=0.8),
            customdata=custom,
            hovertemplate="<b>%{y}</b><br>" + ("<b>%{customdata[0]}</b><extra></extra>" if e_meses else "<b>%{customdata[0]}</b><extra></extra>"),
        )
    )
    fig.update_layout(
        **_layout(titulo, 500, x_titulo="Meses" if e_meses else "R$"),
        showlegend=False,
    )
    fig.update_layout(margin=dict(l=10, r=10, t=56, b=22))
    fig.update_yaxes(
        categoryorder="array",
        categoryarray=nomes[::-1],
        gridcolor=theme.COR["grid"],
        zeroline=False,
        tickfont=dict(size=10),
    )
    if not e_meses:
        fig.update_xaxes(tickprefix="R$ ", separatethousands=True)
    return fig


def grafico_dispersao(locais) -> go.Figure:
    fig = go.Figure()
    pontos = []
    for local in locais:
        res = analysis.resumo(local)
        pontos.append(
            {
                "nome": res["local"],
                "investimento": res["investimento"],
                "saldo": res["saldo_mensal"],
                "receita": res["valor_mensal"],
                "retorno": res["tempo_retorno"],
            }
        )
    for p in pontos:
        cor = theme.COR["primaria"]
        if p["retorno"] is None:
            cor = theme.COR["alerta"]
        elif p["retorno"] > 24:
            cor = theme.COR["alerta"]
        elif p["retorno"] > 12:
            cor = theme.COR["destaque"]
        else:
            cor = theme.COR["sucesso"]
        fig.add_trace(
            go.Scatter(
                x=[p["investimento"]],
                y=[p["saldo"]],
                mode="markers+text",
                name=p["nome"],
                marker=dict(size=11 + (p["receita"] / max(1000, p["receita"])) * 9, color=cor, line=dict(color="#ffffff", width=1.5)),
                text=[""],
                customdata=[[_fmt_br(p["investimento"]), _fmt_br(p["saldo"]), _fmt_br(p["receita"]), f"{p['retorno']:.1f}" if p["retorno"] is not None else "—"]],
                hovertemplate="<b>%{name}</b><br>Investimento: <b>%{customdata[0]}</b><br>Saldo mensal: <b>%{customdata[1]}</b><br>Receita mensal: %{customdata[2]}<br>Retorno: %{customdata[3]} meses<extra></extra>",
            )
        )
    fig.update_layout(
        **_layout("Investimento × saldo mensal por local", 480, x_titulo="Investimento (R$)", y_titulo="Saldo mensal (R$)"),
        showlegend=False,
    )
    fig.update_layout(margin=dict(l=10, r=10, t=56, b=22))
    fig.update_xaxes(tickprefix="R$ ", separatethousands=True)
    fig.update_yaxes(tickprefix="R$ ", separatethousands=True)
    return fig


def grafico_fluxo_caixa(local: loader.Local, meses: int = 12) -> go.Figure:
    fluxo = analysis.fluxo_caixa(local, meses)
    fig = go.Figure()
    pontos = fluxo["pontos"]
    saldos = [p["saldo"] for p in pontos]
    acumulados = [p["acumulado"] for p in pontos]
    fig.add_trace(
        go.Bar(
            x=[p["mes"] for p in pontos],
            y=saldos,
            name="Saldo mensal",
            marker_color=theme.COR["secundaria"],
            marker_line=dict(color="#ffffff", width=0.6),
            customdata=[[_fmt_br(v)] for v in saldos],
            hovertemplate="Mês %{x}<br>Saldo: <b>%{customdata[0]}</b><extra></extra>",
        )
    )
    fig.add_trace(
        go.Scatter(
            x=[p["mes"] for p in pontos],
            y=acumulados,
            mode="lines+markers",
            name="Acumulado",
            line=dict(color=theme.COR["primaria"], width=3, shape="spline"),
            marker=dict(size=7, color=theme.COR["primaria"], line=dict(color="#ffffff", width=1.5)),
            customdata=[[_fmt_br(v)] for v in acumulados],
            hovertemplate="Mês %{x}<br>Acumulado: <b>%{customdata[0]}</b><extra></extra>",
        )
    )
    alvo = local.investimento - local.taxa_instalacao
    if fluxo["payback_mes"]:
        fig.add_vline(
            x=fluxo["payback_mes"],
            line_dash="dot",
            line_color=theme.COR["sucesso"],
            line_width=1.5,
            annotation_text=f"Payback: {fluxo['payback_mes']} meses",
            annotation_position="top left",
            annotation_font=dict(color=theme.COR["sucesso"], size=11.5),
        )
    elif alvo > 0:
        fig.add_hline(
            y=alvo,
            line_dash="dash",
            line_color=theme.COR["alerta"],
            line_width=1.5,
            annotation_text=f"Investimento: {_fmt_br(alvo)}",
            annotation_position="top left",
            annotation_font=dict(color=theme.COR["alerta"], size=11.5),
        )
    fig.update_layout(
        **_layout(f"Fluxo de caixa projetado — {local.nome}", 440, x_titulo="Meses", y_titulo="R$"),
        barmode="group",
        showlegend=True,
    )
    fig.update_yaxes(tickprefix="R$ ", separatethousands=True)
    return fig


def grafico_delta_itens(diferencas: list[dict], n: int = 10) -> go.Figure:
    fig = go.Figure()
    com_delta = [d for d in diferencas if d["tipo"] in ("preco", "quantidade") and d["variacao"] is not None]
    com_delta.sort(key=lambda d: abs(d["variacao"]), reverse=True)
    selecionados = com_delta[:n]
    if not selecionados:
        fig.update_layout(**_layout("Variação por item", 360))
        fig.add_annotation(
            text="Nenhuma variação de preço ou quantidade entre as versões",
            showarrow=False,
            font=dict(color=theme.COR["mutado"], size=13),
        )
        return fig
    nomes = [d["material"][:58] for d in selecionados][::-1]
    variacoes = [d["variacao"] for d in selecionados][::-1]
    cores = [theme.COR["sucesso"] if v >= 0 else theme.COR["alerta"] for v in variacoes]
    fig.add_trace(
        go.Bar(
            x=variacoes,
            y=nomes,
            orientation="h",
            marker_color=cores,
            marker_line=dict(color="#ffffff", width=0.8),
            customdata=[[_fmt_br(v)] for v in variacoes],
            hovertemplate="<b>%{y}</b><br>Variação: <b>%{customdata[0]}</b><extra></extra>",
        )
    )
    fig.update_layout(
        **_layout(f"Variação financeira por item (top {len(selecionados)})", 420, x_titulo="Variação (R$)"),
        showlegend=False,
    )
    fig.update_layout(margin=dict(l=10, r=10, t=56, b=22))
    fig.update_yaxes(
        categoryorder="array",
        categoryarray=nomes[::-1],
        gridcolor=theme.COR["grid"],
        zeroline=False,
        tickfont=dict(size=10),
    )
    fig.update_xaxes(tickprefix="R$ ", separatethousands=True)
    fig.update_xaxes(zeroline=True, zerolinecolor=theme.COR["cinza"], zerolinewidth=1)
    return fig
