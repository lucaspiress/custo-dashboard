import json
import os
import tempfile
import uuid

import pbix_mcp.server as srv

from formatos import fmt_moeda, fmt_numero

HORIZONTES_FLUXO = (6, 12, 24, 36)

_PAGE_LARGURA = 1280
_PAGE_ALTURA = 720


def _num(valor) -> float:
    try:
        return float(valor or 0)
    except (TypeError, ValueError):
        return 0.0


def _coluna_locais(locais: list[dict]) -> list[dict]:
    linhas = []
    for l in locais:
        r = l.get("resumo", {})
        nome = r.get("local") or l.get("nome", "")
        linhas.append(
            {
                "Local": nome,
                "ValorMensal": _num(r.get("valor_mensal")),
                "TaxaInstalacao": _num(r.get("taxa_instalacao")),
                "ImpostosMensais": _num(r.get("impostos")),
                "SaldoAposImpostos": _num(r.get("saldo_apos_impostos")),
                "CustosFixosMensais": (
                    _num(r.get("custo_manutencao"))
                    + _num(r.get("mensal_terceirizada"))
                    + _num(r.get("chip_mensal"))
                    + _num(r.get("custos_softwares"))
                ),
                "CustoManutencao": _num(r.get("custo_manutencao")),
                "MensalTerceirizada": _num(r.get("mensal_terceirizada")),
                "ChipMensal": _num(r.get("chip_mensal")),
                "CustosSoftwares": _num(r.get("custos_softwares")),
                "SaldoMensal": _num(r.get("saldo_mensal")),
                "MaoDeObra": _num(r.get("mao_de_obra")),
                "Equipamento": _num(r.get("equipamento")),
                "Investimento": _num(r.get("investimento")),
                "TempoRetornoMeses": r.get("tempo_retorno"),
                "MesRetorno": r.get("meses_retorno"),
                "Margem": r.get("margem"),
                "ReceitaAnual": _num(r.get("receita_anual")),
                "DataInstalacao": r.get("data_inst"),
                "NumItens": int(r.get("num_itens") or 0),
            }
        )
    return linhas


def _coluna_itens(locais: list[dict]) -> list[dict]:
    linhas = []
    for l in locais:
        r = l.get("resumo", {})
        nome = r.get("local") or l.get("nome", "")
        for item in l.get("itens", []):
            linhas.append(
                {
                    "Local": nome,
                    "Categoria": str(item.get("categoria") or ""),
                    "Codigo": str(item.get("cod") or ""),
                    "Material": str(item.get("material") or ""),
                    "Qtd": _num(item.get("qtd")),
                    "ValorUnitario": _num(item.get("valor_unit")),
                    "ValorTotal": _num(item.get("valor_total")),
                }
            )
    return linhas


def _coluna_fluxo(locais: list[dict]) -> list[dict]:
    linhas = []
    for l in locais:
        r = l.get("resumo", {})
        nome = r.get("local") or l.get("nome", "")
        for h in HORIZONTES_FLUXO:
            fluxo = l.get("fluxo", {}).get(str(h), {})
            for p in fluxo.get("pontos", []):
                linhas.append(
                    {
                        "Local": nome,
                        "HorizonteMeses": h,
                        "Mes": int(p.get("mes") or 0),
                        "Receita": _num(p.get("receita")),
                        "Impostos": _num(p.get("impostos")),
                        "CustosFixos": _num(p.get("custos_fixos")),
                        "Saldo": _num(p.get("saldo")),
                        "Acumulado": _num(p.get("acumulado")),
                        "Payback": bool(p.get("payback")),
                    }
                )
    return linhas


def _medidas() -> list[dict]:
    return [
        {"table": "Locais", "name": "Investimento Total", "expression": "SUM(Locais[Investimento])", "format_string": "$#,##0.00"},
        {"table": "Locais", "name": "Equipamento Total", "expression": "SUM(Locais[Equipamento])", "format_string": "$#,##0.00"},
        {"table": "Locais", "name": "Mao de Obra Total", "expression": "SUM(Locais[MaoDeObra])", "format_string": "$#,##0.00"},
        {"table": "Locais", "name": "Receita Mensal Total", "expression": "SUM(Locais[ValorMensal])", "format_string": "$#,##0.00"},
        {"table": "Locais", "name": "Receita Anual Total", "expression": "SUM(Locais[ReceitaAnual])", "format_string": "$#,##0.00"},
        {"table": "Locais", "name": "Saldo Mensal Total", "expression": "SUM(Locais[SaldoMensal])", "format_string": "$#,##0.00"},
        {"table": "Locais", "name": "Numero de Locais", "expression": "COUNTROWS(Locais)", "format_string": "0"},
        {"table": "Itens", "name": "Numero de Itens", "expression": "COUNTROWS(Itens)", "format_string": "0"},
        {"table": "Locais", "name": "Retorno Medio Meses", "expression": "AVERAGE(Locais[TempoRetornoMeses])", "format_string": "0.0"},
        {"table": "Locais", "name": "Margem Media", "expression": "AVERAGE(Locais[Margem])", "format_string": "0.0%"},
        {"table": "Locais", "name": "Investimento Liquido Total", "expression": "SUM(Locais[Investimento]) - SUM(Locais[TaxaInstalacao])", "format_string": "$#,##0.00"},
        {"table": "Locais", "name": "Resultado 5 Anos", "expression": "SUM(Locais[SaldoMensal]) * 60 - (SUM(Locais[Investimento]) - SUM(Locais[TaxaInstalacao]))", "format_string": "$#,##0.00"},
        {"table": "Locais", "name": "Resultado 10 Anos", "expression": "SUM(Locais[SaldoMensal]) * 120 - (SUM(Locais[Investimento]) - SUM(Locais[TaxaInstalacao]))", "format_string": "$#,##0.00"},
        {"table": "Locais", "name": "ROI 5 Anos", "expression": "DIVIDE([Resultado 5 Anos], SUM(Locais[Investimento]), 0)", "format_string": "0.0%"},
        {"table": "Locais", "name": "ROI 10 Anos", "expression": "DIVIDE([Resultado 10 Anos], SUM(Locais[Investimento]), 0)", "format_string": "0.0%"},
    ]


def _kpi(locais: list[dict]) -> list[dict]:
    resumos = [l.get("resumo", {}) for l in locais]
    investimento = sum(_num(r.get("investimento")) for r in resumos)
    receita = sum(_num(r.get("valor_mensal")) for r in resumos)
    saldo = sum(_num(r.get("saldo_mensal")) for r in resumos)
    retornos = [_num(r.get("tempo_retorno")) for r in resumos if r.get("tempo_retorno") is not None]
    retorno_medio = sum(retornos) / len(retornos) if retornos else None
    return [
        {"title": "Investimento total", "value": fmt_moeda(investimento), "subtitle": f"{len(locais)} local(is)", "accent": "#10a0a0"},
        {"title": "Receita mensal", "value": fmt_moeda(receita), "subtitle": "Somada dos locais", "accent": "#6ba3d7"},
        {"title": "Saldo mensal", "value": fmt_moeda(saldo), "subtitle": "Após impostos e custos", "accent": "#16a36a"},
        {"title": "Retorno médio", "value": fmt_numero(retorno_medio) + " meses" if retorno_medio is not None else "—", "subtitle": "Payback médio dos locais", "accent": "#e07b1a"},
    ]


def _grafico_barras(locais: list[dict], titulo: str, campo: str, e_meses: bool = False) -> dict:
    itens = []
    for l in locais:
        r = l.get("resumo", {})
        valor = r.get(campo)
        rotulo = f"{fmt_moeda(valor)}" if not e_meses else f"{fmt_numero(valor)} meses"
        itens.append([r.get("local") or l.get("nome", ""), _num(valor), rotulo])
    return {"title": titulo, "items": itens, "accent": "#10a0a0"}


def _tabela_locais(locais: list[dict]) -> dict:
    linhas = []
    for l in locais:
        r = l.get("resumo", {})
        retorno = fmt_numero(r.get("tempo_retorno")) if r.get("tempo_retorno") is not None else "—"
        margem = f"{_num(r.get('margem')) * 100:.1f}%" if r.get("margem") is not None else "—"
        linhas.append(
            [
                r.get("local") or l.get("nome", ""),
                fmt_moeda(r.get("investimento")),
                fmt_moeda(r.get("saldo_mensal")),
                retorno,
                margem,
            ]
        )
    return {
        "headers": ["Local", "Investimento", "Saldo mensal", "Retorno (meses)", "Margem"],
        "rows": linhas,
        "accent": "#10a0a0",
        "align_right_from": 1,
    }


def gerar_powerbi(payload: dict) -> bytes:
    locais = payload.get("locais", [])
    if not locais:
        raise ValueError("Nenhum dado de análise para gerar o Power BI.")

    linhas_locais = _coluna_locais(locais)
    linhas_itens = _coluna_itens(locais)
    linhas_fluxo = _coluna_fluxo(locais)

    tabelas = [
        {
            "name": "Locais",
            "columns": [
                {"name": "Local", "data_type": "String"},
                {"name": "ValorMensal", "data_type": "Double"},
                {"name": "TaxaInstalacao", "data_type": "Double"},
                {"name": "ImpostosMensais", "data_type": "Double"},
                {"name": "SaldoAposImpostos", "data_type": "Double"},
                {"name": "CustosFixosMensais", "data_type": "Double"},
                {"name": "CustoManutencao", "data_type": "Double"},
                {"name": "MensalTerceirizada", "data_type": "Double"},
                {"name": "ChipMensal", "data_type": "Double"},
                {"name": "CustosSoftwares", "data_type": "Double"},
                {"name": "SaldoMensal", "data_type": "Double"},
                {"name": "MaoDeObra", "data_type": "Double"},
                {"name": "Equipamento", "data_type": "Double"},
                {"name": "Investimento", "data_type": "Double"},
                {"name": "TempoRetornoMeses", "data_type": "Double"},
                {"name": "MesRetorno", "data_type": "Int64"},
                {"name": "Margem", "data_type": "Double"},
                {"name": "ReceitaAnual", "data_type": "Double"},
                {"name": "DataInstalacao", "data_type": "String"},
                {"name": "NumItens", "data_type": "Int64"},
            ],
            "rows": linhas_locais,
        },
        {
            "name": "Itens",
            "columns": [
                {"name": "Local", "data_type": "String"},
                {"name": "Categoria", "data_type": "String"},
                {"name": "Codigo", "data_type": "String"},
                {"name": "Material", "data_type": "String"},
                {"name": "Qtd", "data_type": "Double"},
                {"name": "ValorUnitario", "data_type": "Double"},
                {"name": "ValorTotal", "data_type": "Double"},
            ],
            "rows": linhas_itens,
        },
        {
            "name": "FluxoCaixa",
            "columns": [
                {"name": "Local", "data_type": "String"},
                {"name": "HorizonteMeses", "data_type": "Int64"},
                {"name": "Mes", "data_type": "Int64"},
                {"name": "Receita", "data_type": "Double"},
                {"name": "Impostos", "data_type": "Double"},
                {"name": "CustosFixos", "data_type": "Double"},
                {"name": "Saldo", "data_type": "Double"},
                {"name": "Acumulado", "data_type": "Double"},
                {"name": "Payback", "data_type": "Boolean"},
            ],
            "rows": linhas_fluxo,
        },
    ]
    relacoes = [
        {"from_table": "Itens", "from_column": "Local", "to_table": "Locais", "to_column": "Local"},
        {"from_table": "FluxoCaixa", "from_column": "Local", "to_table": "Locais", "to_column": "Local"},
    ]

    alias = f"custo_{uuid.uuid4().hex[:10]}"
    with tempfile.TemporaryDirectory() as tmp:
        caminho = os.path.join(tmp, "analise.pbix")
        try:
            srv.pbix_create(
                caminho,
                alias,
                json.dumps(tabelas),
                json.dumps(_medidas()),
                json.dumps(relacoes),
            )
            srv.pbix_rename_page(alias, 0, "Visão Geral")
            _adicionar_visuais(alias, locais)
            srv.pbix_save(alias, output_path=caminho, overwrite=True, backup=False)
        finally:
            srv.pbix_close(alias)
        with open(caminho, "rb") as arquivo:
            return arquivo.read()


def _adicionar_visuais(alias: str, locais: list[dict]) -> None:
    posicoes_kpi = [(40, 40, 280, 110), (340, 40, 280, 110), (640, 40, 280, 110), (940, 40, 280, 110)]
    for (x, y, w, h), spec in zip(posicoes_kpi, _kpi(locais)):
        srv.pbix_add_html_visual(alias, 0, template="kpi_card", template_spec_json=json.dumps(spec), x=x, y=y, width=w, height=h)
    posicoes_barra = [(40, 170, 390, 250), (445, 170, 390, 250), (850, 170, 390, 250)]
    graficos = [
        _grafico_barras(locais, "Investimento por local", "investimento"),
        _grafico_barras(locais, "Saldo mensal por local", "saldo_mensal"),
        _grafico_barras(locais, "Retorno por local (meses)", "tempo_retorno", e_meses=True),
    ]
    for (x, y, w, h), spec in zip(posicoes_barra, graficos):
        srv.pbix_add_html_visual(alias, 0, template="bar_chart", template_spec_json=json.dumps(spec), x=x, y=y, width=w, height=h)
    srv.pbix_add_html_visual(
        alias, 0, template="table", template_spec_json=json.dumps(_tabela_locais(locais)),
        x=40, y=440, width=1200, height=250,
    )
