import analysis
import config
import loader


def _fmt_pct(valor) -> str:
    return f"{valor * 100:.1f}%"


def gerar_insights(local: loader.Local) -> list[dict]:
    insights: list[dict] = []
    resumo = analysis.resumo(local)
    nome = local.nome

    retorno = resumo["tempo_retorno"]
    if retorno is None:
        insights.append(
            {
                "severidade": "alerta",
                "texto": f"{nome}: saldo mensal zerado ou negativo — o investimento nunca se paga nas condições atuais. Revise receita ou custos fixos.",
            }
        )
    elif retorno <= config.LIMITE_RETORNO_SAUDAVEL:
        insights.append(
            {
                "severidade": "ok",
                "texto": f"{nome}: tempo de retorno de {retorno:.1f} meses — saudável (limite de {config.LIMITE_RETORNO_SAUDAVEL} meses).",
            }
        )
    elif retorno <= config.LIMITE_RETORNO_ACEITAVEL:
        insights.append(
            {
                "severidade": "atencao",
                "texto": f"{nome}: tempo de retorno de {retorno:.1f} meses — aceitável, mas próximo do limite de {config.LIMITE_RETORNO_ACEITAVEL} meses.",
            }
        )
    else:
        insights.append(
            {
                "severidade": "alerta",
                "texto": f"{nome}: tempo de retorno de {retorno:.1f} meses — acima do limite de {config.LIMITE_RETORNO_ACEITAVEL} meses. Projeto com payback longo.",
            }
        )

    margem = resumo["margem"]
    if margem is not None:
        if margem < 0.20:
            insights.append(
                {
                    "severidade": "alerta",
                    "texto": f"{nome}: margem de {_fmt_pct(margem)} sobre a receita — apertada. Custos fixos consomem quase todo o saldo.",
                }
            )
        elif margem >= 0.35:
            insights.append(
                {
                    "severidade": "ok",
                    "texto": f"{nome}: margem de {_fmt_pct(margem)} sobre a receita — ótima capacidade de geração de saldo.",
                }
            )
        else:
            insights.append(
                {
                    "severidade": "dica",
                    "texto": f"{nome}: margem de {_fmt_pct(margem)} sobre a receita — saudável, com folga limitada.",
                }
            )

    if local.investimento > 0 and resumo["receita_anual"] > 0:
        razao = local.investimento / resumo["receita_anual"]
        if razao > 0.5:
            insights.append(
                {
                    "severidade": "atencao",
                    "texto": f"{nome}: investimento equivale a {_fmt_pct(razao)} da receita anual — exposição alta para um único projeto.",
                }
            )

    total_equip = local.equipamento
    if local.investimento > 0 and total_equip > 0:
        pct_equip = total_equip / local.investimento
        if pct_equip > 0.7:
            insights.append(
                {
                    "severidade": "atencao",
                    "texto": f"{nome}: equipamento representa {_fmt_pct(pct_equip)} do investimento — concentração alta em ativos.",
                }
            )

    categorias = analysis.por_categoria(local)
    if len(categorias) > 1:
        dominante = categorias[0]
        insights.append(
            {
                "severidade": "dica",
                "texto": f"{nome}: {dominante['categoria']} domina o custo de equipamento com {dominante['pct']:.1f}% do total.",
            }
        )

    pareto = analysis.pareto(local, 5)
    if pareto:
        top = pareto[0]
        if top["pct"] > 25:
            insights.append(
                {
                    "severidade": "atencao",
                    "texto": f"{nome}: item '{top['material'][:60]}' responde sozinho por {top['pct']:.1f}% do custo de equipamento — negociação deste item impacta muito o total.",
                }
            )
        if pareto[-1]["pct_acumulado"] >= 70:
            insights.append(
                {
                    "severidade": "dica",
                    "texto": f"{nome}: os {len(pareto)} maiores itens concentram {pareto[-1]['pct_acumulado']:.1f}% do custo de equipamento (efeito Pareto).",
                }
            )

    anomalias = analysis.anomalias_preco_unitario(local)
    for anomalia in anomalias[:3]:
        insights.append(
            {
                "severidade": "atencao",
                "texto": f"{nome}: preço unitário atípico de R$ {anomalia['valor_unit']:.2f} em '{anomalia['material'][:60]}' "
                f"({anomalia['z_score']:.1f} desvios acima da média da categoria {anomalia['categoria']}).",
            }
        )

    if local.data_inst:
        import datetime

        hoje = datetime.date.today()
        data = local.data_inst.date() if isinstance(local.data_inst, datetime.datetime) else local.data_inst
        if data >= hoje:
            dias = (data - hoje).days
            insights.append(
                {
                    "severidade": "dica",
                    "texto": f"{nome}: instalação prevista para {data.strftime('%d/%m/%Y')} (em {dias} dias).",
                }
            )
        else:
            dias = (hoje - data).days
            insights.append(
                {
                    "severidade": "ok",
                    "texto": f"{nome}: instalação realizada em {data.strftime('%d/%m/%Y')} (há {dias} dias).",
                }
            )

    if not local.itens:
        insights.append(
            {
                "severidade": "alerta",
                "texto": f"{nome}: nenhuma aba de equipamento vinculada — valide o nome da aba (deve conter o nome do local).",
            }
        )

    return insights
