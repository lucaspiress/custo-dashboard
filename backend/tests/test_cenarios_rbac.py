import pytest
import analysis
import loader


def test_curva_s_investimentos_calculo():
    local = loader.Local(
        nome="Local Teste",
        valor_mensal=10000.0,
        taxa_instalacao=2000.0,
        custo_manutencao=1000.0,
        mensal_terceirizada=500.0,
        chip_mensal=100.0,
        custos_softwares=400.0,
        mao_de_obra=5000.0,
        data_inst=None,
    )

    local.itens = [
        loader.Item(categoria="Material", cod="M01", material="Cabo", qtd=10, valor_unit=500.0, valor_total=5000.0)
    ]
    # Investimento total = 5000 (mao de obra) + 5000 (equipamentos) = 10000
    # Desembolso inicial = Investimento (10000) - Taxa instalacao (2000) = 8000
    curva = analysis.curva_s_investimentos([local], meses=12)
    assert len(curva) == 13
    assert curva[0]["mes"] == 0
    assert curva[0]["investimento_acumulado"] == 8000.0
    assert curva[0]["resultado_acumulado"] == -8000.0
    assert curva[12]["mes"] == 12
    assert curva[12]["percentual_concluido"] == 100.0


def test_cenarios_store(tmp_path, monkeypatch):
    import os
    db_path = str(tmp_path / "test_cenarios.db")
    monkeypatch.setenv("HISTORICO_DB", db_path)
    monkeypatch.setenv("DATABASE_URL", "")

    import history
    import projetos_store

    conn = history._conexao()
    history._inicializar(conn)
    conn.close()

    proj = projetos_store.criar_projeto("Projeto Teste Cenários")
    c = projetos_store.criar_cenario(proj["id"], "Cenário Otimista", variacao_mensal=10.0, variacao_instalacao=-5.0)
    assert c["id"] is not None
    assert c["nome"] == "Cenário Otimista"

    lista = projetos_store.listar_cenarios(proj["id"])
    assert len(lista) == 1
    assert lista[0]["nome"] == "Cenário Otimista"

    ok = projetos_store.excluir_cenario(c["id"])
    assert ok is True
    assert len(projetos_store.listar_cenarios(proj["id"])) == 0
