import json
import pytest
import plotly.graph_objects as go

import analysis
import charts
import loader
from routers.projetos import _payload_projeto


@pytest.fixture
def amostra_locais():
    item1 = loader.Item(
        cod="001",
        material="Câmera IP Speed Dome",
        qtd=4.0,
        valor_unit=1500.0,
        valor_total=6000.0,
        categoria="CFTV",
    )
    item2 = loader.Item(
        cod="002",
        material="NVR 16 Canais",
        qtd=1.0,
        valor_unit=2500.0,
        valor_total=2500.0,
        categoria="CFTV",
    )
    item3 = loader.Item(
        cod="003",
        material="Cabo UTP Cat6 305m",
        qtd=2.0,
        valor_unit=600.0,
        valor_total=1200.0,
        categoria="Infraestrutura",
    )

    local_a = loader.Local(
        nome="Matriz Centro",
        valor_mensal=12000.0,
        taxa_instalacao=2000.0,
        custo_manutencao=500.0,
        mensal_terceirizada=1000.0,
        chip_mensal=200.0,
        custos_softwares=400.0,
        mao_de_obra=3000.0,
        data_inst=None,
        itens=[item1, item2, item3],
    )

    item4 = loader.Item(
        cod="004",
        material="Sensor IVP",
        qtd=10.0,
        valor_unit=150.0,
        valor_total=1500.0,
        categoria="Alarme",
    )

    local_b = loader.Local(
        nome="Filial Zona Sul",
        valor_mensal=6000.0,
        taxa_instalacao=1000.0,
        custo_manutencao=300.0,
        mensal_terceirizada=500.0,
        chip_mensal=100.0,
        custos_softwares=200.0,
        mao_de_obra=1500.0,
        data_inst=None,
        itens=[item4],
    )

    return [local_a, local_b]


# --- Testes Simulador Monte Carlo ---

def test_simulacao_monte_carlo_basico(amostra_locais):
    res = analysis.simulacao_monte_carlo(amostra_locais, iteracoes=500)
    assert isinstance(res, dict)
    assert res["iteracoes"] == 500
    assert "investimento_base" in res
    assert "saldo_mensal_base" in res
    assert "prob_payback_12m" in res
    assert "prob_payback_24m" in res
    assert "prob_payback_36m" in res
    assert "prob_prejuizo" in res
    assert "histograma" in res
    assert len(res["histograma"]["faixas"]) == 4
    assert sum(res["histograma"]["frequencias"]) == 500
    assert 0.0 <= res["prob_payback_12m"] <= 100.0
    assert 0.0 <= res["prob_payback_36m"] <= 100.0


def test_simulacao_monte_carlo_vazio():
    res = analysis.simulacao_monte_carlo([], iteracoes=100)
    assert res["investimento_base"] == 0.0
    assert res["saldo_mensal_base"] == 0.0
    assert res["payback_medio"] is None
    assert res["prob_payback_12m"] == 0.0
    assert res["histograma"]["frequencias"] == [0, 0, 0, 0]


# --- Testes Score de Saúde Financeira ---

def test_calcular_score_saude_saudavel(amostra_locais):
    saude = analysis.calcular_score_saude(amostra_locais)
    assert isinstance(saude, dict)
    assert 0.0 <= saude["score"] <= 100.0
    assert saude["classificacao"] in ["Excelente", "Saudável", "Atenção", "Crítico"]
    assert "sub_scores" in saude
    assert "metricas" in saude
    assert isinstance(saude["recomendacoes"], list)
    assert len(saude["recomendacoes"]) > 0


def test_calcular_score_saude_deficitario():
    item = loader.Item(
        cod="001",
        material="Item caro",
        qtd=10.0,
        valor_unit=5000.0,
        valor_total=50000.0,
        categoria="Geral",
    )
    local_prejuizo = loader.Local(
        nome="Local Ruim",
        valor_mensal=1000.0,
        taxa_instalacao=0.0,
        custo_manutencao=2000.0,
        mensal_terceirizada=1000.0,
        chip_mensal=500.0,
        custos_softwares=500.0,
        mao_de_obra=10000.0,
        data_inst=None,
        itens=[item],
    )
    saude = analysis.calcular_score_saude([local_prejuizo])
    assert saude["score"] < 50.0
    assert saude["classificacao"] in ["Atenção", "Crítico"]
    assert any("saldo mensal negativo" in r.lower() for r in saude["recomendacoes"])


def test_calcular_score_saude_vazio():
    saude = analysis.calcular_score_saude([])
    assert saude["score"] == 0.0
    assert saude["classificacao"] == "Crítico"
    assert len(saude["recomendacoes"]) == 1


# --- Testes dos 5 Novos Gráficos ---

def test_grafico_pareto_global(amostra_locais):
    fig = charts.grafico_pareto_global(amostra_locais)
    assert isinstance(fig, go.Figure)
    payload = json.loads(fig.to_json())
    assert "data" in payload
    assert len(payload["data"]) >= 2  # Barras Custo + Linha % Acumulado


def test_grafico_scatter_risco_retorno(amostra_locais):
    fig = charts.grafico_scatter_risco_retorno(amostra_locais)
    assert isinstance(fig, go.Figure)
    payload = json.loads(fig.to_json())
    assert "data" in payload
    assert len(payload["data"]) == 1
    assert payload["data"][0]["type"] == "scatter"


def test_grafico_gauge_saude():
    fig = charts.grafico_gauge_saude(85.5)
    assert isinstance(fig, go.Figure)
    payload = json.loads(fig.to_json())
    assert "data" in payload
    assert payload["data"][0]["type"] == "indicator"
    assert payload["data"][0]["value"] == 85.5


def test_grafico_donut_custos_operacionais(amostra_locais):
    fig = charts.grafico_donut_custos_operacionais(amostra_locais)
    assert isinstance(fig, go.Figure)
    payload = json.loads(fig.to_json())
    assert "data" in payload
    assert payload["data"][0]["type"] == "pie"
    assert payload["data"][0]["hole"] == 0.5


def test_grafico_fluxo_empilhado(amostra_locais):
    fig = charts.grafico_fluxo_empilhado(amostra_locais, meses=24)
    assert isinstance(fig, go.Figure)
    payload = json.loads(fig.to_json())
    assert "data" in payload
    assert len(payload["data"]) == 4  # Impostos, Custos, Saldo, Receita


def test_novos_graficos_vazio():
    locais_vazio = []
    fig_pareto = charts.grafico_pareto_global(locais_vazio)
    fig_scatter = charts.grafico_scatter_risco_retorno(locais_vazio)
    fig_gauge = charts.grafico_gauge_saude(0.0)
    fig_donut = charts.grafico_donut_custos_operacionais(locais_vazio)
    fig_fluxo = charts.grafico_fluxo_empilhado(locais_vazio, meses=12)

    for fig in (fig_pareto, fig_scatter, fig_gauge, fig_donut, fig_fluxo):
        assert isinstance(fig, go.Figure)
        assert json.loads(fig.to_json()) is not None


# --- Teste de Integração Payload de Projetos ---

def test_payload_projeto_novos_campos(amostra_locais):
    wb = loader.WorkbookData(locais=amostra_locais, avisos=[])
    payload = _payload_projeto(wb, "Projeto Teste v7")

    assert payload["filename"] == "Projeto Teste v7"
    assert "projeto" in payload
    proj = payload["projeto"]

    # Verificar chave monte_carlo
    assert "monte_carlo" in proj
    assert proj["monte_carlo"]["iteracoes"] == 1000

    # Verificar chave score_saude
    assert "score_saude" in proj
    assert "score" in proj["score_saude"]

    # Verificar novos gráficos
    graficos = proj["graficos"]
    novos_graficos = ["pareto_global", "scatter_risco", "gauge_saude", "donut_operacional", "fluxo_empilhado"]
    for chave in novos_graficos:
        assert chave in graficos, f"Gráfico {chave} ausente no payload do projeto"
        assert isinstance(graficos[chave], str)  # JSON string do Plotly
        parsed = json.loads(graficos[chave])
        assert "data" in parsed
