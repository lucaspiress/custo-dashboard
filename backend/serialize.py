import loader


def _data_iso(valor) -> str | None:
    if valor is None:
        return None
    return valor.isoformat()


def resumo_payload(resumo: dict) -> dict:
    return {**resumo, "data_inst": _data_iso(resumo.get("data_inst"))}


def item_payload(item: loader.Item) -> dict:
    return {
        "cod": item.cod,
        "material": item.material,
        "qtd": float(item.qtd),
        "valor_unit": float(item.valor_unit),
        "valor_total": float(item.valor_total),
        "categoria": item.categoria,
    }


def local_payload(local: loader.Local, insights: list[dict] | None = None, graficos: dict | None = None) -> dict:
    return {
        "nome": local.nome,
        "resumo": resumo_payload(_resumo_local(local)),
        "itens": [item_payload(item) for item in local.itens],
        "insights": insights or [],
        "graficos": graficos or {},
    }


def _resumo_local(local: loader.Local) -> dict:
    import analysis

    return analysis.resumo(local)


def workbook_payload(workbook: loader.WorkbookData, insights_fn, graficos_fn) -> dict:
    locais = []
    for local in workbook.locais:
        locais.append(local_payload(local, insights_fn(local), graficos_fn(local)))
    return {
        "avisos": workbook.avisos,
        "locais": locais,
    }
