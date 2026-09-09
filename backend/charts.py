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
        title=dict(text=titulo, font=dict(size=14, color=theme.COR["tinta"], family=theme.FONTE_UI)),
        paper_bgcolor=theme.COR["superficie"],
        plot_bgcolor=theme.COR["superficie"],
        font=dict(family=theme.FONTE_UI, color=theme.COR["mutado"], size=11),
        xaxis=dict(title=x_titulo, gridcolor=theme.COR["grid"], zeroline=False, tickfont=dict(size=10)),
        yaxis=dict(title=y_titulo, gridcolor=theme.COR["grid"], zeroline=False, tickfont=dict(size=10)),
        height=altura,
        margin=dict(l=10, r=10, t=56, b=46),
        hoverlabel=dict(bgcolor=theme.COR["fundo"], font=dict(color="#ffffff", family=theme.FONTE_UI, size=12)),
        legend=dict(orientation="h", yanchor="top", y=-0.12, x=0, xanchor="left", font=dict(size=11), bgcolor="rgba(0,0,0,0)"),
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
        **_layout(f"Curva de payback - {local.nome}", 420, x_titulo="Meses", y_titulo="Saldo acumulado (R$)")
    )
    fig.update_layout(showlegend=False)
    fig.update_yaxes(tickprefix="R$ ", separatethousands=True, title_font=dict(size=10))
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
        **_layout(f"Top {len(dados)} itens por valor - {local.nome}", 440, x_titulo="Valor do item (R$)")
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
        margin=dict(l=10, r=10, t=90, b=24),
        showlegend=False,
    )
    return fig


def _legenda_donut(labels: list[str], valores: list[float], cores: list[str]) -> str:
    partes = []
    for label, valor, cor in zip(labels, valores, cores):
        partes.append(
            f'<span style="color:{cor}">&#9632;</span> '
            f'<b style="color:{theme.COR["tinta"]}">{label}</b> '
            f'<span style="color:{theme.COR["mutado"]}">{_fmt_br(valor)}</span>'
        )
    return " &nbsp;&nbsp; ".join(partes)


def _grafico_donut(labels: list[str], valores: list[float], titulo: str, cores: list[str]) -> go.Figure:
    total = sum(valores)
    fig = go.Figure(
        go.Pie(
            labels=labels,
            values=valores,
            hole=0.58,
            marker_colors=cores,
            textinfo="none",
            marker=dict(line=dict(color=theme.COR["superficie"], width=2)),
            customdata=[
                [f"{(v / total * 100):.1f}%" if total else "0.0%", _fmt_br(v)]
                for v in valores
            ],
            hovertemplate="<b>%{label}</b><br>%{customdata[1]} (%{customdata[0]})<extra></extra>",
            sort=False,
        )
    )
    base = _layout(titulo, 400)
    base["margin"] = dict(l=16, r=16, t=56, b=58)
    fig.update_layout(**base)
    fig.update_layout(
        showlegend=False,
        annotations=[
            dict(
                text=f"<b>{_fmt_br(total)}</b>",
                x=0.5,
                y=0.52,
                showarrow=False,
                font=dict(family=theme.FONTE_NUMERO, size=16, color=theme.COR["tinta"]),
            ),
            dict(
                text="TOTAL",
                x=0.5,
                y=0.45,
                showarrow=False,
                font=dict(family=theme.FONTE_UI, size=10, color=theme.COR["mutado"]),
            ),
            dict(
                text=_legenda_donut(labels, valores, cores),
                x=0.5,
                y=-0.12,
                showarrow=False,
                xref="paper",
                yref="paper",
                font=dict(family=theme.FONTE_UI, size=11),
                xanchor="center",
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


def grafico_barras_comparativo(locais, metrica: str, titulo: str, e_meses: bool = False) -> go.Figure:
    fig = go.Figure()
    dados = [(analysis.resumo(local), local) for local in locais]
    dados.sort(key=lambda par: par[0][metrica] if par[0][metrica] is not None else float("-inf"), reverse=True)
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
    custom = [["Sem retorno" if e_meses and v is None else _fmt_br(v, 1) if not e_meses else f"{v:.1f} meses"] for v in valores]
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
        **_layout(titulo, 380, x_titulo="Meses" if e_meses else None),
        showlegend=False,
        bargap=0.45,
    )
    fig.update_layout(margin=dict(l=10, r=10, t=56, b=24))
    fig.update_yaxes(
        categoryorder="array",
        categoryarray=nomes[::-1],
        gridcolor=theme.COR["grid"],
        zeroline=False,
        tickfont=dict(size=10),
    )
    if len(nomes) == 1:
        fig.update_yaxes(range=[-0.6, 0.6])
    if not e_meses:
        fig.update_xaxes(tickprefix="R$ ", separatethousands=True, title=None)
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
        **_layout("Investimento × saldo mensal por local", 420, x_titulo="Investimento", y_titulo="Saldo mensal"),
        showlegend=False,
    )
    fig.update_layout(margin=dict(l=10, r=10, t=56, b=46))
    fig.update_xaxes(tickprefix="R$ ", separatethousands=True, title_font=dict(size=10))
    fig.update_yaxes(tickprefix="R$ ", separatethousands=True, title_font=dict(size=10))
    return fig


def grafico_fluxo_caixa(local: loader.Local, meses: int = 12) -> go.Figure:
    fluxo = analysis.fluxo_caixa(local, meses)
    fig = go.Figure()
    pontos = fluxo["pontos"]
    saldos = [p["saldo"] for p in pontos]
    acumulados = [p["acumulado"] for p in pontos]
    saldos_variancia = (max(saldos) - min(saldos)) if saldos else 0
    if saldos_variancia > 0:
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
        **_layout("", 420, x_titulo="Meses", y_titulo=None),
        barmode="group",
        showlegend=True,
    )
    fig.update_yaxes(tickprefix="R$ ", separatethousands=True)
    return fig


def grafico_curva_s(locais: list[loader.Local], meses: int = 36) -> go.Figure:
    curva = analysis.curva_s_investimentos(locais, meses)
    fig = go.Figure()

    eixo_x = [p["mes"] for p in curva]
    investimentos = [p["investimento_acumulado"] for p in curva]
    resultados = [p["resultado_acumulado"] for p in curva]

    fig.add_trace(
        go.Scatter(
            x=eixo_x,
            y=investimentos,
            mode="lines",
            name="Investimento Líquido Inicial",
            line=dict(color=theme.COR["alerta"], width=2, dash="dash"),
            customdata=[[_fmt_br(v)] for v in investimentos],
            hovertemplate="Mês %{x}<br>Investimento: <b>%{customdata[0]}</b><extra></extra>",
        )
    )

    fig.add_trace(
        go.Scatter(
            x=eixo_x,
            y=resultados,
            mode="lines+markers",
            name="Resultado Acumulado (Curva S)",
            line=dict(color=theme.COR["primaria"], width=3.5, shape="spline"),
            fill="tozeroy",
            fillcolor="rgba(16, 160, 160, 0.08)",
            marker=dict(size=6, color=theme.COR["primaria"]),
            customdata=[[_fmt_br(v), f"{p['percentual_concluido']}%"] for v, p in zip(resultados, curva)],
            hovertemplate="Mês %{x}<br>Resultado Acumulado: <b>%{customdata[0]}</b><br>Progresso: %{customdata[1]}<extra></extra>",
        )
    )

    fig.update_layout(
        **_layout("Curva S - Investimento Líquido vs Resultado Acumulado", 440, x_titulo="Meses", y_titulo="Valor (R$)"),
        showlegend=True,
    )
    fig.update_yaxes(tickprefix="R$ ", separatethousands=True)
    return fig


def grafico_pareto_global(locais: list[loader.Local]) -> go.Figure:
    """Análise ABC 80/20 combinando barras de custo por material + linha de % acumulado."""
    fig = go.Figure()
    if not locais:
        fig.update_layout(**_layout("Análise Pareto Global ABC (80/20)", 440))
        fig.add_annotation(text="Nenhum local disponível", showarrow=False, font=dict(color=theme.COR["alerta"], size=13))
        return fig

    totais_por_material: dict[str, float] = {}
    for local in locais:
        for item in local.itens:
            mat = item.material or "Sem descrição"
            totais_por_material[mat] = totais_por_material.get(mat, 0.0) + item.valor_total

    if not totais_por_material:
        fig.update_layout(**_layout("Análise Pareto Global ABC (80/20)", 440))
        fig.add_annotation(text="Nenhum item de custo cadastrado", showarrow=False, font=dict(color=theme.COR["alerta"], size=13))
        return fig

    materiais_ord = sorted(totais_por_material.items(), key=lambda x: x[1], reverse=True)[:15]
    total_projeto = sum(totais_por_material.values()) or 1.0

    nomes = [m[0][:40] for m in materiais_ord]
    valores = [m[1] for m in materiais_ord]

    acumulado = 0.0
    pct_acumulado = []
    for val in valores:
        acumulado += val
        pct_acumulado.append((acumulado / total_projeto) * 100.0)

    custom_barras = [[_fmt_br(v), f"{(v/total_projeto)*100:.1f}%"] for v in valores]

    fig.add_trace(
        go.Bar(
            x=nomes,
            y=valores,
            name="Custo Total",
            marker_color=theme.COR["primaria"],
            customdata=custom_barras,
            hovertemplate="<b>%{x}</b><br>Custo: <b>%{customdata[0]}</b> (%{customdata[1]})<extra></extra>",
        )
    )

    fig.add_trace(
        go.Scatter(
            x=nomes,
            y=pct_acumulado,
            name="% Acumulado",
            yaxis="y2",
            mode="lines+markers",
            line=dict(color=theme.COR["destaque"], width=2.5),
            marker=dict(size=6, color=theme.COR["destaque"]),
            hovertemplate="<b>%{x}</b><br>Acumulado: <b>%{y:.1f}%</b><extra></extra>",
        )
    )

    fig.add_hline(
        y=80.0,
        yref="y2",
        line_dash="dash",
        line_color=theme.COR["alerta"],
        line_width=1.5,
        annotation_text="Corte 80%",
        annotation_position="top right",
        annotation_font=dict(color=theme.COR["alerta"], size=11),
    )

    fig.update_layout(
        **_layout("Análise Pareto Global ABC (80/20)", 440, x_titulo="Material", y_titulo="Custo Total (R$)")
    )
    fig.update_layout(
        yaxis2=dict(
            title="% Acumulado",
            overlaying="y",
            side="right",
            range=[0, 105],
            showgrid=False,
            ticksuffix="%",
            tickfont=dict(size=10),
        ),
        margin=dict(l=10, r=40, t=56, b=80),
        showlegend=True,
    )
    fig.update_yaxes(tickprefix="R$ ", separatethousands=True)
    return fig


def grafico_scatter_risco_retorno(locais: list[loader.Local]) -> go.Figure:
    """Matriz Scatter Investimento vs Saldo Mensal (Tamanho: Qtd Itens, Cor: Payback em meses)."""
    fig = go.Figure()
    if not locais:
        fig.update_layout(**_layout("Matriz Risco x Retorno", 440))
        fig.add_annotation(text="Nenhum local disponível", showarrow=False, font=dict(color=theme.COR["alerta"], size=13))
        return fig

    nomes = [l.nome for l in locais]
    investimentos = [l.investimento for l in locais]
    saldos = [l.saldo_mensal for l in locais]
    qtd_itens = [len(l.itens) for l in locais]
    paybacks = [(l.tempo_retorno if l.tempo_retorno is not None else 60.0) for l in locais]
    paybacks_texto = [f"{l.tempo_retorno:.1f} meses" if l.tempo_retorno is not None else "Inviável" for l in locais]

    max_itens = max(qtd_itens) if (qtd_itens and max(qtd_itens) > 0) else 1
    tamanhos = [max(12, min(40, (q / max_itens) * 36 + 12)) for q in qtd_itens]

    custom = [[_fmt_br(inv), _fmt_br(sal), q, pb_t] for inv, sal, q, pb_t in zip(investimentos, saldos, qtd_itens, paybacks_texto)]

    fig.add_trace(
        go.Scatter(
            x=investimentos,
            y=saldos,
            text=nomes,
            mode="markers+text",
            textposition="top center",
            marker=dict(
                size=tamanhos,
                color=paybacks,
                colorscale="Viridis_r",
                showscale=True,
                colorbar=dict(title="Payback (m)", ticksuffix=" m"),
                line=dict(color="#ffffff", width=1.5),
            ),
            customdata=custom,
            hovertemplate="<b>%{text}</b><br>Investimento: <b>%{customdata[0]}</b><br>Saldo Mensal: <b>%{customdata[1]}</b><br>Itens: %{customdata[2]}<br>Payback: <b>%{customdata[3]}</b><extra></extra>",
        )
    )

    fig.update_layout(
        **_layout("Matriz de Risco x Retorno por Local", 440, x_titulo="Investimento Total (R$)", y_titulo="Saldo Mensal (R$)")
    )
    fig.update_xaxes(tickprefix="R$ ", separatethousands=True)
    fig.update_yaxes(tickprefix="R$ ", separatethousands=True)
    return fig


def grafico_gauge_saude(score: float) -> go.Figure:
    """Velocímetro de Saúde Financeira de 0 a 100."""
    fig = go.Figure()
    score_val = max(0.0, min(100.0, float(score or 0)))

    fig.add_trace(
        go.Indicator(
            mode="gauge+number",
            value=score_val,
            number={"suffix": " pts", "font": {"color": theme.COR["tinta"], "size": 26}},
            gauge={
                "axis": {"range": [0, 100], "tickwidth": 1, "tickcolor": theme.COR["mutado"]},
                "bar": {"color": theme.COR["primaria"]},
                "bgcolor": theme.COR["elevado"],
                "borderwidth": 1,
                "bordercolor": theme.COR["borda"],
                "steps": [
                    {"range": [0, 40], "color": "rgba(239, 68, 68, 0.35)"},
                    {"range": [40, 60], "color": "rgba(224, 123, 26, 0.35)"},
                    {"range": [60, 80], "color": "rgba(59, 130, 246, 0.35)"},
                    {"range": [80, 100], "color": "rgba(16, 185, 129, 0.35)"},
                ],
                "threshold": {
                    "line": {"color": theme.COR["sucesso"], "width": 4},
                    "thickness": 0.75,
                    "value": score_val,
                },
            },
        )
    )
    fig.update_layout(**_layout("Score de Saúde Financeira", 340))
    fig.update_layout(margin=dict(l=20, r=20, t=50, b=20))
    return fig


def grafico_donut_custos_operacionais(locais: list[loader.Local]) -> go.Figure:
    """Donut de Distribuição de Custos Operacionais (Softwares, Chips, Terceirização, Manutenção, Mão de Obra)."""
    fig = go.Figure()
    if not locais:
        fig.update_layout(**_layout("Distribuição de Custos Operacionais", 380))
        fig.add_annotation(text="Nenhum local disponível", showarrow=False, font=dict(color=theme.COR["alerta"], size=13))
        return fig

    softwares = sum(l.custos_softwares for l in locais)
    chips = sum(l.chip_mensal for l in locais)
    terceirizacao = sum(l.mensal_terceirizada for l in locais)
    manutencao = sum(l.custo_manutencao for l in locais)
    mao_obra = sum(l.mao_de_obra for l in locais)

    labels = ["Softwares", "Chips M2M", "Terceirização", "Manutenção", "Mão de Obra"]
    valores = [softwares, chips, terceirizacao, manutencao, mao_obra]
    custom = [[_fmt_br(v)] for v in valores]

    if sum(valores) == 0:
        fig.update_layout(**_layout("Distribuição de Custos Operacionais", 380))
        fig.add_annotation(text="Sem custos operacionais registrados", showarrow=False, font=dict(color=theme.COR["alerta"], size=13))
        return fig

    fig.add_trace(
        go.Pie(
            labels=labels,
            values=valores,
            hole=0.5,
            marker=dict(colors=theme.PALETA_GRAFICOS[:5], line=dict(color=theme.COR["superficie"], width=2)),
            customdata=custom,
            hovertemplate="<b>%{label}</b><br>Valor: <b>%{customdata[0]}</b><br>Percentual: %{percent}<extra></extra>",
            textinfo="percent+label",
            textfont=dict(size=11),
        )
    )

    fig.update_layout(**_layout("Distribuição de Custos Operacionais", 380))
    return fig


def grafico_fluxo_empilhado(locais: list[loader.Local], meses: int = 36) -> go.Figure:
    """Barras empilhadas de Receita vs Impostos vs Custos vs Saldo."""
    fig = go.Figure()
    if not locais or meses <= 0:
        fig.update_layout(**_layout("Fluxo de Caixa Projetado (Empilhado)", 420))
        fig.add_annotation(text="Dados insuficientes para projeção", showarrow=False, font=dict(color=theme.COR["alerta"], size=13))
        return fig

    meses_list = list(range(1, meses + 1))
    receita_bruta = sum(l.valor_mensal for l in locais)
    impostos = sum(l.impostos for l in locais)
    custos = sum(l.custos_fixos for l in locais)
    saldo = sum(l.saldo_mensal for l in locais)

    fig.add_trace(
        go.Bar(
            x=meses_list,
            y=[impostos] * meses,
            name="Impostos",
            marker_color=theme.COR["cinza"],
            customdata=[[_fmt_br(impostos)]] * meses,
            hovertemplate="Mês %{x}<br>Impostos: <b>%{customdata[0]}</b><extra></extra>",
        )
    )

    fig.add_trace(
        go.Bar(
            x=meses_list,
            y=[custos] * meses,
            name="Custos Fixos",
            marker_color=theme.COR["destaque"],
            customdata=[[_fmt_br(custos)]] * meses,
            hovertemplate="Mês %{x}<br>Custos Fixos: <b>%{customdata[0]}</b><extra></extra>",
        )
    )

    fig.add_trace(
        go.Bar(
            x=meses_list,
            y=[saldo] * meses,
            name="Saldo Líquido Mensal",
            marker_color=theme.COR["sucesso"],
            customdata=[[_fmt_br(saldo)]] * meses,
            hovertemplate="Mês %{x}<br>Saldo Líquido: <b>%{customdata[0]}</b><extra></extra>",
        )
    )

    fig.add_trace(
        go.Scatter(
            x=meses_list,
            y=[receita_bruta] * meses,
            name="Receita Bruta Total",
            mode="lines",
            line=dict(color=theme.COR["primaria"], width=3),
            customdata=[[_fmt_br(receita_bruta)]] * meses,
            hovertemplate="Mês %{x}<br>Receita Bruta: <b>%{customdata[0]}</b><extra></extra>",
        )
    )

    fig.update_layout(
        **_layout("Fluxo de Caixa Empilhado", 420, x_titulo="Mês", y_titulo="Valor Mensal (R$)")
    )
    fig.update_layout(barmode="stack")
    fig.update_yaxes(tickprefix="R$ ", separatethousands=True)
    return fig


