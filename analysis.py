import math
from statistics import mean, stdev

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
