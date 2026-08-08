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


def workbook_from_payload(payload: dict) -> loader.WorkbookData:
    locais = []
    for registro in payload.get("locais", []):
        resumo = registro.get("resumo", {})
        local = loader.Local(
            nome=resumo.get("local") or registro.get("nome", ""),
            valor_mensal=_numero(resumo.get("valor_mensal")),
            taxa_instalacao=_numero(resumo.get("taxa_instalacao")),
            custo_manutencao=_numero(resumo.get("custo_manutencao")),
            mensal_terceirizada=_numero(resumo.get("mensal_terceirizada")),
            chip_mensal=_numero(resumo.get("chip_mensal")),
            custos_softwares=_numero(resumo.get("custos_softwares")),
            mao_de_obra=_numero(resumo.get("mao_de_obra")),
            data_inst=loader._to_date(resumo.get("data_inst")),
            itens=[
                loader.Item(
                    cod=str(item.get("cod") or ""),
                    material=str(item.get("material") or ""),
                    qtd=_numero(item.get("qtd")),
                    valor_unit=_numero(item.get("valor_unit")),
                    valor_total=_numero(item.get("valor_total")),
                    categoria=str(item.get("categoria") or ""),
                )
                for item in registro.get("itens", [])
            ],
        )
        locais.append(local)
    return loader.WorkbookData(locais=locais, avisos=payload.get("avisos", []))


def _numero(valor) -> float:
    try:
        return float(valor or 0)
    except (TypeError, ValueError):
        return 0.0
