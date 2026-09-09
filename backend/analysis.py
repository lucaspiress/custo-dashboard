import math
import random
from statistics import mean, stdev

import config
import loader


def resumo(local: loader.Local) -> dict:
    retorno = local.tempo_retorno
    return {
        "local": local.nome,
        "valor_mensal": local.valor_mensal,
        "taxa_instalacao": local.taxa_instalacao,
        "impostos": local.impostos,
        "saldo_apos_impostos": local.saldo_apos_impostos,
        "custo_manutencao": local.custo_manutencao,
        "mensal_terceirizada": local.mensal_terceirizada,
        "chip_mensal": local.chip_mensal,
        "custos_softwares": local.custos_softwares,
        "saldo_mensal": local.saldo_mensal,
        "mao_de_obra": local.mao_de_obra,
        "equipamento": local.equipamento,
        "investimento": local.investimento,
        "tempo_retorno": retorno,
        "meses_retorno": _meses_retorno(local),
        "margem": local.margem,
        "receita_anual": local.receita_anual,
        "data_inst": local.data_inst,
        "num_itens": len(local.itens),
    }


def _meses_retorno(local: loader.Local) -> int | None:
    if local.saldo_mensal <= 0:
        return None
    alvo = local.investimento - local.taxa_instalacao
    return math.ceil(alvo / local.saldo_mensal)


def composicao_investimento(local: loader.Local) -> list[dict]:
    return [
        {"nome": "Mão de obra", "valor": local.mao_de_obra},
        {"nome": "Equipamento", "valor": local.equipamento},
    ]


def por_categoria(local: loader.Local) -> list[dict]:
    totais: dict[str, float] = {}
    for item in local.itens:
        totais[item.categoria] = totais.get(item.categoria, 0.0) + item.valor_total
    total = sum(totais.values()) or 1.0
    return [
        {"categoria": nome, "valor": valor, "pct": valor / total * 100}
        for nome, valor in sorted(totais.items(), key=lambda x: x[1], reverse=True)
    ]


def top_itens(local: loader.Local, n: int = 15) -> list[loader.Item]:
    ordenados = sorted(local.itens, key=lambda i: i.valor_total, reverse=True)
    return ordenados[:n]


def pareto(local: loader.Local, n: int = 15) -> list[dict]:
    itens = top_itens(local, n)
    total = sum(i.valor_total for i in local.itens) or 1.0
    acumulado = 0.0
    resultado = []
    for item in itens:
        acumulado += item.valor_total
        resultado.append(
            {
                "material": item.material,
                "valor": item.valor_total,
                "pct": item.valor_total / total * 100,
                "pct_acumulado": acumulado / total * 100,
            }
        )
    return resultado


def anomalias_preco_unitario(local: loader.Local, limite: float = 2.0) -> list[dict]:
    anomalias = []
    for categoria in {i.categoria for i in local.itens}:
        itens_cat = [i for i in local.itens if i.categoria == categoria and i.qtd > 0]
        if len(itens_cat) < 3:
            continue
        valores = [i.valor_unit for i in itens_cat]
        media = mean(valores)
        desvio = stdev(valores)
        if desvio == 0:
            continue
        for item in itens_cat:
            z = (item.valor_unit - media) / desvio
            if z >= limite:
                anomalias.append(
                    {
                        "material": item.material,
                        "categoria": categoria,
                        "valor_unit": item.valor_unit,
                        "z_score": z,
                        "media_categoria": media,
                    }
                )
    anomalias.sort(key=lambda a: a["z_score"], reverse=True)
    return anomalias


def curva_payback(local: loader.Local) -> list[dict]:
    if local.saldo_mensal <= 0:
        return []
    alvo = local.investimento - local.taxa_instalacao
    meses = _meses_retorno(local) or 0
    curva = [{"mes": 0, "saldo_acumulado": 0.0}]
    for mes in range(1, meses + 1):
        acumulado = local.saldo_mensal * mes
        curva.append({"mes": mes, "saldo_acumulado": acumulado})
        if acumulado >= alvo:
            break
    return curva


def resumo_projeto(locais: list[loader.Local]) -> dict:
    resumos = [resumo(local) for local in locais]
    return {
        "locais": resumos,
        "totais": {
            "receita_mensal": sum(r["valor_mensal"] for r in resumos),
            "receita_anual": sum(r["receita_anual"] for r in resumos),
            "saldo_mensal": sum(r["saldo_mensal"] for r in resumos),
            "investimento": sum(r["investimento"] for r in resumos),
            "equipamento": sum(r["equipamento"] for r in resumos),
            "mao_de_obra": sum(r["mao_de_obra"] for r in resumos),
            "num_locais": len(resumos),
            "num_itens": sum(r["num_itens"] for r in resumos),
        },
    }


def fluxo_caixa(local: loader.Local, meses: int = 12) -> dict:
    if meses <= 0:
        meses = 12
    alvo = local.investimento - local.taxa_instalacao
    acumulado = 0.0
    payback_mes = None
    pontos = []
    for mes in range(1, meses + 1):
        saldo = local.saldo_mensal
        acumulado += saldo
        atingiu = alvo > 0 and acumulado >= alvo
        if atingiu and payback_mes is None:
            payback_mes = mes
        pontos.append(
            {
                "mes": mes,
                "receita": local.valor_mensal,
                "impostos": local.impostos,
                "custos_fixos": local.custos_fixos,
                "saldo": saldo,
                "acumulado": acumulado,
                "payback": atingiu,
            }
        )
    return {"local": local.nome, "meses": meses, "payback_mes": payback_mes, "pontos": pontos}


def curva_s_investimentos(locais: list[loader.Local], meses: int = 36) -> list[dict]:
    """Gera dados acumulados no tempo para a Curva S (Investimento Inicial vs Faturamento Acumulado)."""
    investimento_total = sum(l.investimento for l in locais)
    taxas_instalacao_total = sum(l.taxa_instalacao for l in locais)
    saldo_mensal_total = sum(l.saldo_mensal for l in locais)

    curva = []
    desembolso_inicial = investimento_total - taxas_instalacao_total
    resultado_acumulado = -desembolso_inicial

    curva.append({
        "mes": 0,
        "investimento_acumulado": desembolso_inicial,
        "resultado_acumulado": resultado_acumulado,
        "percentual_concluido": 0.0
    })

    for mes in range(1, meses + 1):
        resultado_acumulado += saldo_mensal_total
        pct = min(100.0, (mes / meses) * 100.0)
        curva.append({
            "mes": mes,
            "investimento_acumulado": desembolso_inicial,
            "resultado_acumulado": resultado_acumulado,
            "percentual_concluido": round(pct, 1)
        })
    return curva


def simulacao_monte_carlo(locais: list[loader.Local], iteracoes: int = 1000) -> dict:
    """Executa simulação probabilística de Monte Carlo variando custos e inadimplência."""
    if not locais or iteracoes <= 0:
        return {
            "iteracoes": iteracoes,
            "investimento_base": 0.0,
            "saldo_mensal_base": 0.0,
            "payback_medio": None,
            "payback_p10": None,
            "payback_p50": None,
            "payback_p90": None,
            "prob_payback_12m": 0.0,
            "prob_payback_24m": 0.0,
            "prob_payback_36m": 0.0,
            "prob_prejuizo": 0.0,
            "histograma": {
                "faixas": ["<= 12m", "13-24m", "25-36m", "> 36m / Inviável"],
                "frequencias": [0, 0, 0, 0],
                "percentuais": [0.0, 0.0, 0.0, 0.0],
            },
            "resultados_payback": [],
        }

    investimento_total = sum(l.investimento for l in locais)
    taxas_instalacao_total = sum(l.taxa_instalacao for l in locais)
    desembolso_base = investimento_total - taxas_instalacao_total
    receita_mensal_base = sum(l.valor_mensal for l in locais)
    custos_fixos_base = sum(l.custos_fixos for l in locais)
    saldo_mensal_base = sum(l.saldo_mensal for l in locais)

    paybacks = []
    count_12 = 0
    count_24 = 0
    count_36 = 0
    count_prejuizo = 0
    count_incalculavel = 0

    for _ in range(iteracoes):
        fator_custo = random.uniform(0.85, 1.25)
        fator_inadimplencia = random.uniform(0.0, 0.10)
        fator_investimento = random.uniform(0.95, 1.15)

        receita_sim = receita_mensal_base * (1.0 - fator_inadimplencia)
        impostos_sim = receita_sim * config.TAXA_IMPOSTOS
        custos_sim = custos_fixos_base * fator_custo
        saldo_sim = receita_sim - impostos_sim - custos_sim
        desembolso_sim = desembolso_base * fator_investimento

        if saldo_sim <= 0:
            count_prejuizo += 1
            count_incalculavel += 1
        else:
            if desembolso_sim <= 0:
                meses_payback = 0.0
            else:
                meses_payback = desembolso_sim / saldo_sim

            paybacks.append(meses_payback)

            if meses_payback <= 12:
                count_12 += 1
            elif meses_payback <= 24:
                count_24 += 1
            elif meses_payback <= 36:
                count_36 += 1
            else:
                count_incalculavel += 1

    total_sim = float(iteracoes)
    freq_12 = count_12
    freq_24 = count_24
    freq_36 = count_36
    freq_inc = count_incalculavel

    prob_12 = (freq_12 / total_sim) * 100.0
    prob_24 = ((freq_12 + freq_24) / total_sim) * 100.0
    prob_36 = ((freq_12 + freq_24 + freq_36) / total_sim) * 100.0
    prob_prejuizo = (count_prejuizo / total_sim) * 100.0

    paybacks_ordenados = sorted(paybacks)
    if paybacks_ordenados:
        payback_medio = mean(paybacks_ordenados)
        idx_p10 = int(len(paybacks_ordenados) * 0.10)
        idx_p50 = int(len(paybacks_ordenados) * 0.50)
        idx_p90 = int(len(paybacks_ordenados) * 0.90)
        p10 = paybacks_ordenados[min(idx_p10, len(paybacks_ordenados) - 1)]
        p50 = paybacks_ordenados[min(idx_p50, len(paybacks_ordenados) - 1)]
        p90 = paybacks_ordenados[min(idx_p90, len(paybacks_ordenados) - 1)]
    else:
        payback_medio = None
        p10 = None
        p50 = None
        p90 = None

    return {
        "iteracoes": iteracoes,
        "investimento_base": round(desembolso_base, 2),
        "saldo_mensal_base": round(saldo_mensal_base, 2),
        "payback_medio": round(payback_medio, 1) if payback_medio is not None else None,
        "payback_p10": round(p10, 1) if p10 is not None else None,
        "payback_p50": round(p50, 1) if p50 is not None else None,
        "payback_p90": round(p90, 1) if p90 is not None else None,
        "prob_payback_12m": round(prob_12, 1),
        "prob_payback_24m": round(prob_24, 1),
        "prob_payback_36m": round(prob_36, 1),
        "prob_prejuizo": round(prob_prejuizo, 1),
        "histograma": {
            "faixas": ["<= 12m", "13-24m", "25-36m", "> 36m / Inviável"],
            "frequencias": [freq_12, freq_24, freq_36, freq_inc],
            "percentuais": [
                round((freq_12 / total_sim) * 100, 1),
                round((freq_24 / total_sim) * 100, 1),
                round((freq_36 / total_sim) * 100, 1),
                round((freq_inc / total_sim) * 100, 1),
            ],
        },
        "resultados_payback": [round(p, 1) for p in paybacks],
    }


def calcular_score_saude(locais: list[loader.Local]) -> dict:
    """Calcula score de saúde financeira (0 a 100) e fornece diagnósticos/recomendações."""
    if not locais:
        return {
            "score": 0.0,
            "classificacao": "Crítico",
            "sub_scores": {"margem": 0.0, "payback": 0.0, "roi": 0.0, "cobertura": 0.0},
            "metricas": {
                "margem_global_pct": 0.0,
                "payback_meses": None,
                "roi_anual_pct": 0.0,
                "saldo_mensal_total": 0.0,
                "investimento_total": 0.0,
            },
            "recomendacoes": ["Nenhum local cadastrado no projeto para avaliação."],
        }

    receita_total = sum(l.valor_mensal for l in locais)
    saldo_total = sum(l.saldo_mensal for l in locais)
    investimento_total = sum(l.investimento for l in locais)
    taxas_total = sum(l.taxa_instalacao for l in locais)
    custos_fixos_totais = sum(l.custos_fixos for l in locais)
    desembolso_net = investimento_total - taxas_total

    # 1. Margem Líquida (Ideal: >= 30%)
    margem_global = (saldo_total / receita_total) if receita_total > 0 else 0.0
    if margem_global >= 0.30:
        score_margem = 100.0
    elif margem_global <= 0.0:
        score_margem = 0.0
    else:
        score_margem = (margem_global / 0.30) * 100.0

    # 2. Payback (Ideal: <= 12 meses -> 100. Até 36 meses -> proporcional até 30. >36 -> 0)
    payback_meses = (desembolso_net / saldo_total) if saldo_total > 0 else None
    if payback_meses is None or payback_meses < 0:
        score_payback = 0.0
    elif payback_meses <= 12.0:
        score_payback = 100.0
    elif payback_meses <= 36.0:
        score_payback = 100.0 - ((payback_meses - 12.0) / 24.0) * 70.0
    else:
        score_payback = max(0.0, 30.0 - ((payback_meses - 36.0) / 24.0) * 30.0)

    # 3. ROI Anual (Ideal: >= 30% a.a.)
    roi_anual = (saldo_total * 12.0 / desembolso_net) if desembolso_net > 0 else 0.0
    if roi_anual >= 0.30:
        score_roi = 100.0
    elif roi_anual <= 0.0:
        score_roi = 0.0
    else:
        score_roi = (roi_anual / 0.30) * 100.0

    # 4. Cobertura (Razão Saldo / Custos Fixos, Ideal: >= 1.5)
    cobertura = (saldo_total / custos_fixos_totais) if custos_fixos_totais > 0 else 1.5
    if cobertura >= 1.5:
        score_cobertura = 100.0
    elif cobertura <= 0.0:
        score_cobertura = 0.0
    else:
        score_cobertura = (cobertura / 1.5) * 100.0

    # Ponderação final
    score_final = (
        0.30 * score_margem
        + 0.30 * score_payback
        + 0.20 * score_roi
        + 0.20 * score_cobertura
    )
    score_final = max(0.0, min(100.0, round(score_final, 1)))

    if score_final >= 80.0:
        classificacao = "Excelente"
    elif score_final >= 60.0:
        classificacao = "Saudável"
    elif score_final >= 40.0:
        classificacao = "Atenção"
    else:
        classificacao = "Crítico"

    recomendacoes = []
    locais_deficitarios = [l for l in locais if l.saldo_mensal <= 0]
    if locais_deficitarios:
        nomes = ", ".join(f"'{l.nome}'" for l in locais_deficitarios)
        recomendacoes.append(f"Atenção: O(s) local(is) {nomes} apresenta(m) saldo mensal negativo ou nulo.")

    if margem_global < 0.20:
        recomendacoes.append(f"Margem operacional global ({margem_global*100:.1f}%) abaixo da meta de 20%. Recomenda-se renegociar fornecedores e licenças.")

    if payback_meses is None or payback_meses > 24.0:
        p_str = f"{payback_meses:.1f} meses" if payback_meses else "inviável"
        recomendacoes.append(f"Tempo de retorno global elevado ({p_str}). Avalie aumentar a taxa de instalação inicial.")

    if sum(l.custos_softwares for l in locais) > sum(l.mensal_terceirizada for l in locais):
        recomendacoes.append("Custos de software representam parcela relevante das despesas fixas. Considerar contratos corporativos.")

    if not recomendacoes:
        recomendacoes.append("Projeto com excelente equilíbrio financeiro, retorno dentro do prazo e margem saudável.")

    return {
        "score": score_final,
        "classificacao": classificacao,
        "sub_scores": {
            "margem": round(score_margem, 1),
            "payback": round(score_payback, 1),
            "roi": round(score_roi, 1),
            "cobertura": round(score_cobertura, 1),
        },
        "metricas": {
            "margem_global_pct": round(margem_global * 100, 1),
            "payback_meses": round(payback_meses, 1) if payback_meses is not None else None,
            "roi_anual_pct": round(roi_anual * 100, 1),
            "saldo_mensal_total": round(saldo_total, 2),
            "investimento_total": round(investimento_total, 2),
        },
        "recomendacoes": recomendacoes,
    }


