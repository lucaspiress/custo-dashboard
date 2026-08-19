import pytest

import agregador


def _login(cliente, username="admin", senha="admin123456"):
    resposta = cliente.post("/api/auth/login", json={"username": username, "senha": senha})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _criar_projeto(cliente, nome="Projeto Dashboards"):
    resposta = cliente.post("/api/projetos", json={"nome": nome})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _criar_local(cliente, projeto_id, **campos):
    dados = {"nome": "SESC TESTE", "valor_mensal": 10000, "mao_de_obra": 2000}
    dados.update(campos)
    resposta = cliente.post(f"/api/projetos/{projeto_id}/locais", json=dados)
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _criar_item(cliente, local_id, **campos):
    dados = {"categoria": "ALARME", "material": "Central de alarme", "qtd": 1, "valor_unit": 1500}
    dados.update(campos)
    resposta = cliente.post(f"/api/projetos/locais/{local_id}/itens", json=dados)
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _criar_dataset(cliente, projeto_id, nome="Dataset Livre"):
    resposta = cliente.post(f"/api/projetos/{projeto_id}/datasets", json={"nome": nome})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _criar_dashboard(cliente, projeto_id, nome="Dashboard 1"):
    resposta = cliente.post(f"/api/projetos/{projeto_id}/dashboards", json={"nome": nome})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def test_criar_dashboard(cliente, admin):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"], nome="Meu Dashboard")
    assert dashboard["id"] > 0
    assert dashboard["nome"] == "Meu Dashboard"
    assert dashboard["projeto_id"] == projeto["id"]


def test_primeiro_dashboard_vem_com_widgets_padrao(cliente, admin):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    assert len(dashboard["widgets"]) == 2
    tipos = {w["type"] for w in dashboard["widgets"]}
    assert tipos == {"table"}
    datasets = {w["dataset_id"] for w in dashboard["widgets"]}
    assert f"locais-{projeto['id']}" in datasets
    assert f"itens-{projeto['id']}" in datasets


def test_limite_20_dashboards(cliente, admin):
    projeto = _criar_projeto(cliente)
    for i in range(20):
        _criar_dashboard(cliente, projeto["id"], nome=f"Dashboard {i}")
    resposta = cliente.post(f"/api/projetos/{projeto['id']}/dashboards", json={"nome": "Dashboard 21"})
    assert resposta.status_code == 400
    assert "20" in resposta.json()["detail"]


def test_limite_50_widgets(cliente, admin):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    # já tem 2 widgets padrão; adicionar até 50
    for i in range(48):
        resposta = cliente.post(
            f"/api/dashboards/{dashboard['id']}/widgets",
            json={"type": "kpi", "dataset_id": f"locais-{projeto['id']}",
                  "config_json": {"field": "valor_mensal", "aggregation": "sum"}},
        )
        assert resposta.status_code == 200, resposta.text
    resposta = cliente.post(
        f"/api/dashboards/{dashboard['id']}/widgets",
        json={"type": "kpi", "dataset_id": f"locais-{projeto['id']}",
              "config_json": {"field": "valor_mensal", "aggregation": "sum"}},
    )
    assert resposta.status_code == 400
    assert "50" in resposta.json()["detail"]


def test_get_dashboard_completo(cliente, admin):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    cliente.post(
        f"/api/dashboards/{dashboard['id']}/slicers",
        json={"dataset_id": f"locais-{projeto['id']}", "field": "nome", "tipo": "lista"},
    )
    resposta = cliente.get(f"/api/projetos/{projeto['id']}/dashboards/{dashboard['id']}")
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert len(corpo["widgets"]) == 2
    assert len(corpo["slicers"]) == 1


def test_patch_delete_dashboard(cliente, admin):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    resposta = cliente.patch(
        f"/api/projetos/{projeto['id']}/dashboards/{dashboard['id']}",
        json={"nome": "Renomeado", "eh_interno": True},
    )
    assert resposta.status_code == 200
    assert resposta.json()["nome"] == "Renomeado"
    assert resposta.json()["eh_interno"] is True
    assert cliente.delete(f"/api/projetos/{projeto['id']}/dashboards/{dashboard['id']}").status_code == 204
    assert cliente.get(f"/api/projetos/{projeto['id']}/dashboards/{dashboard['id']}").status_code == 404


def test_crud_widget(cliente, admin):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    widget = cliente.post(
        f"/api/dashboards/{dashboard['id']}/widgets",
        json={"type": "kpi", "dataset_id": f"locais-{projeto['id']}",
              "config_json": {"field": "valor_mensal", "aggregation": "sum"}},
    ).json()
    assert widget["type"] == "kpi"
    atualizado = cliente.patch(
        f"/api/dashboards/{dashboard['id']}/widgets/{widget['id']}",
        json={"type": "bar", "config_json": {"x": "nome", "y": ["valor_mensal"], "aggregation": "sum"}},
    ).json()
    assert atualizado["type"] == "bar"
    assert cliente.delete(f"/api/dashboards/{dashboard['id']}/widgets/{widget['id']}").status_code == 204
    widgets = cliente.get(f"/api/projetos/{projeto['id']}/dashboards/{dashboard['id']}").json()["widgets"]
    # restam apenas os 2 widgets padrão (tabela locais + tabela itens)
    assert len(widgets) == 2
    assert all(w["type"] == "table" for w in widgets)
    assert widget["id"] not in {w["id"] for w in widgets}


def test_crud_slicer(cliente, admin):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    slicer = cliente.post(
        f"/api/dashboards/{dashboard['id']}/slicers",
        json={"dataset_id": f"locais-{projeto['id']}", "field": "nome", "tipo": "lista"},
    ).json()
    assert slicer["field"] == "nome"
    assert slicer["tipo"] == "lista"
    assert cliente.delete(f"/api/dashboards/{dashboard['id']}/slicers/{slicer['id']}").status_code == 204
    assert cliente.get(f"/api/projetos/{projeto['id']}/dashboards/{dashboard['id']}").json()["slicers"] == []


def test_query_bar_widget(cliente, admin):
    projeto = _criar_projeto(cliente)
    dataset = _criar_dataset(cliente, projeto["id"])
    rows = [{"row_index": i, "data_json": {"categoria": f"cat{i % 3}", "valor": 10}} for i in range(100)]
    cliente.post(f"/api/datasets/{dataset['id']}/rows", json={"rows": rows})
    dashboard = _criar_dashboard(cliente, projeto["id"])
    widget = cliente.post(
        f"/api/dashboards/{dashboard['id']}/widgets",
        json={"type": "bar", "dataset_id": str(dataset["id"]),
              "config_json": {"x": "categoria", "y": ["valor"], "aggregation": "sum"}},
    ).json()
    resposta = cliente.post(f"/api/dashboards/{dashboard['id']}/query", json={"widget_ids": [widget["id"]]})
    assert resposta.status_code == 200
    w = next(w for w in resposta.json()["widgets"] if w["widget_id"] == widget["id"])
    assert w["type"] == "bar"
    assert len(w["data"]["x"]) == 3
    assert len(w["data"]["series"]) == 1
    assert sum(w["data"]["series"][0]["data"]) == 1000


def test_query_com_slicer(cliente, admin):
    projeto = _criar_projeto(cliente)
    dataset = _criar_dataset(cliente, projeto["id"])
    rows = [{"row_index": i, "data_json": {"categoria": f"cat{i % 2}", "valor": 10}} for i in range(10)]
    cliente.post(f"/api/datasets/{dataset['id']}/rows", json={"rows": rows})
    dashboard = _criar_dashboard(cliente, projeto["id"])
    slicer = cliente.post(
        f"/api/dashboards/{dashboard['id']}/slicers",
        json={"dataset_id": str(dataset["id"]), "field": "categoria", "tipo": "lista"},
    ).json()
    widget = cliente.post(
        f"/api/dashboards/{dashboard['id']}/widgets",
        json={"type": "bar", "dataset_id": str(dataset["id"]),
              "config_json": {"x": "categoria", "y": ["valor"], "aggregation": "sum"}},
    ).json()
    resposta = cliente.post(
        f"/api/dashboards/{dashboard['id']}/query",
        json={"widget_ids": [widget["id"]], "slicer_values": {str(slicer["id"]): ["cat0"]}},
    )
    assert resposta.status_code == 200
    corpo = resposta.json()
    w = next(w for w in corpo["widgets"] if w["widget_id"] == widget["id"])
    assert w["data"]["x"] == ["cat0"]
    assert w["data"]["series"][0]["data"] == [50]
    # slicer options disponíveis
    s = next(s for s in corpo["slicers"] if s["slicer_id"] == slicer["id"])
    assert set(s["options"]) == {"cat0", "cat1"}


def test_query_kpi(cliente, admin):
    projeto = _criar_projeto(cliente)
    dataset = _criar_dataset(cliente, projeto["id"])
    rows = [{"row_index": i, "data_json": {"valor": 10}} for i in range(5)]
    cliente.post(f"/api/datasets/{dataset['id']}/rows", json={"rows": rows})
    dashboard = _criar_dashboard(cliente, projeto["id"])
    widget = cliente.post(
        f"/api/dashboards/{dashboard['id']}/widgets",
        json={"type": "kpi", "dataset_id": str(dataset["id"]),
              "config_json": {"field": "valor", "aggregation": "sum", "label": "Total"}},
    ).json()
    resposta = cliente.post(f"/api/dashboards/{dashboard['id']}/query", json={"widget_ids": [widget["id"]]})
    assert resposta.status_code == 200
    w = next(w for w in resposta.json()["widgets"] if w["widget_id"] == widget["id"])
    assert w["data"]["value"] == 50
    assert w["data"]["label"] == "Total"


def test_query_table(cliente, admin):
    projeto = _criar_projeto(cliente)
    dataset = _criar_dataset(cliente, projeto["id"])
    rows = [{"row_index": i, "data_json": {"nome": f"n{i}", "valor": i}} for i in range(3)]
    cliente.post(f"/api/datasets/{dataset['id']}/rows", json={"rows": rows})
    dashboard = _criar_dashboard(cliente, projeto["id"])
    widget = cliente.post(
        f"/api/dashboards/{dashboard['id']}/widgets",
        json={"type": "table", "dataset_id": str(dataset["id"]),
              "config_json": {"colunas": ["nome", "valor"]}},
    ).json()
    resposta = cliente.post(f"/api/dashboards/{dashboard['id']}/query", json={"widget_ids": [widget["id"]]})
    assert resposta.status_code == 200
    w = next(w for w in resposta.json()["widgets"] if w["widget_id"] == widget["id"])
    assert w["data"]["colunas"] == ["nome", "valor"]
    assert len(w["data"]["linhas"]) == 3


def test_agregador_itens_virtual(cliente, admin):
    projeto = _criar_projeto(cliente)
    local = _criar_local(cliente, projeto["id"])
    _criar_item(cliente, local["id"], material="Central", qtd=1, valor_unit=1500)
    _criar_item(cliente, local["id"], material="Câmera", qtd=2, valor_unit=850, categoria="CFTV")
    dashboard = _criar_dashboard(cliente, projeto["id"])
    widget = cliente.post(
        f"/api/dashboards/{dashboard['id']}/widgets",
        json={"type": "bar", "dataset_id": f"itens-{projeto['id']}",
              "config_json": {"x": "categoria", "y": ["valor_total"], "aggregation": "sum"}},
    ).json()
    resposta = cliente.post(f"/api/dashboards/{dashboard['id']}/query", json={"widget_ids": [widget["id"]]})
    assert resposta.status_code == 200
    w = next(w for w in resposta.json()["widgets"] if w["widget_id"] == widget["id"])
    assert len(w["data"]["x"]) == 2
    assert sum(w["data"]["series"][0]["data"]) == 1500 + 2 * 850


def test_agregacao_invalida_400(cliente, admin):
    projeto = _criar_projeto(cliente)
    dataset = _criar_dataset(cliente, projeto["id"])
    cliente.post(f"/api/datasets/{dataset['id']}/rows", json={"rows": [{"row_index": 0, "data_json": {"v": 1}}]})
    dashboard = _criar_dashboard(cliente, projeto["id"])
    widget = cliente.post(
        f"/api/dashboards/{dashboard['id']}/widgets",
        json={"type": "bar", "dataset_id": str(dataset["id"]),
              "config_json": {"x": "v", "y": ["v"], "aggregation": "soma"}},
    ).json()
    resposta = cliente.post(f"/api/dashboards/{dashboard['id']}/query", json={"widget_ids": [widget["id"]]})
    assert resposta.status_code == 400


def test_agregador_direto_agregacao_invalida(cliente, admin):
    with pytest.raises(ValueError):
        agregador.agregar("1", aggregation="soma", field="v")


def test_sem_login_401(cliente):
    assert cliente.get("/api/projetos/1/dashboards").status_code == 401
    assert cliente.post("/api/projetos/1/dashboards", json={"nome": "X"}).status_code == 401
    assert cliente.get("/api/projetos/1/dashboards/1").status_code == 401
    assert cliente.post("/api/dashboards/1/widgets", json={}).status_code == 401
    assert cliente.post("/api/dashboards/1/slicers", json={}).status_code == 401
    assert cliente.post("/api/dashboards/1/query", json={}).status_code == 401
