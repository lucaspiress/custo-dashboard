import agregador


def _login(cliente, username="admin", senha="admin123456"):
    resposta = cliente.post("/api/auth/login", json={"username": username, "senha": senha})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _criar_projeto(cliente, nome="Projeto Campos"):
    resposta = cliente.post("/api/projetos", json={"nome": nome})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _criar_dataset(cliente, projeto_id, nome="Dataset Campos"):
    resposta = cliente.post(f"/api/projetos/{projeto_id}/datasets", json={"nome": nome})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _adicionar_linhas(cliente, did):
    resposta = cliente.post(
        f"/api/datasets/{did}/rows",
        json={"rows": [
            {"row_index": 0, "data_json": {"quantidade": 3, "custo_unitario": 10, "tipo": "A"}},
            {"row_index": 1, "data_json": {"quantidade": 2, "custo_unitario": 5, "tipo": "B"}},
        ]},
    )
    assert resposta.status_code == 200, resposta.text


def _criar_campo(cliente, did, nome, formula):
    resposta = cliente.post(
        f"/api/datasets/{did}/campos-calculados",
        json={"nome": nome, "formula": formula},
    )
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def test_criar_campo(cliente, admin):
    projeto = _criar_projeto(cliente)
    dataset = _criar_dataset(cliente, projeto["id"])
    _adicionar_linhas(cliente, dataset["id"])
    campo = _criar_campo(cliente, dataset["id"], "total", "quantidade * custo_unitario")
    assert campo["id"] > 0
    assert campo["nome"] == "total"
    assert campo["formula"] == "quantidade * custo_unitario"
    assert "quantidade" in campo["dependencias_json"]
    assert "custo_unitario" in campo["dependencias_json"]


def test_criar_campo_formula_invalida_400(cliente, admin):
    projeto = _criar_projeto(cliente)
    dataset = _criar_dataset(cliente, projeto["id"])
    resposta = cliente.post(
        f"/api/datasets/{dataset['id']}/campos-calculados",
        json={"nome": "evil", "formula": "EVIL(col)"},
    )
    assert resposta.status_code == 400
    assert "Fórmula inválida" in resposta.json()["detail"]["erro"]


def test_criar_campo_dataset_virtual_405(cliente, admin):
    projeto = _criar_projeto(cliente)
    resposta = cliente.post(
        f"/api/datasets/locais-{projeto['id']}/campos-calculados",
        json={"nome": "x", "formula": "nome"},
    )
    assert resposta.status_code == 405


def test_listar_campos(cliente, admin):
    projeto = _criar_projeto(cliente)
    dataset = _criar_dataset(cliente, projeto["id"])
    _adicionar_linhas(cliente, dataset["id"])
    _criar_campo(cliente, dataset["id"], "total", "quantidade * custo_unitario")
    _criar_campo(cliente, dataset["id"], "dobro", "quantidade * 2")
    resposta = cliente.get(f"/api/datasets/{dataset['id']}/campos-calculados")
    assert resposta.status_code == 200
    campos = resposta.json()
    assert len(campos) == 2
    assert {c["nome"] for c in campos} == {"total", "dobro"}


def test_atualizar_campo(cliente, admin):
    projeto = _criar_projeto(cliente)
    dataset = _criar_dataset(cliente, projeto["id"])
    _adicionar_linhas(cliente, dataset["id"])
    campo = _criar_campo(cliente, dataset["id"], "total", "quantidade * custo_unitario")
    resposta = cliente.patch(
        f"/api/datasets/{dataset['id']}/campos-calculados/{campo['id']}",
        json={"formula": "quantidade + custo_unitario"},
    )
    assert resposta.status_code == 200
    assert resposta.json()["formula"] == "quantidade + custo_unitario"


def test_atualizar_campo_formula_invalida_400(cliente, admin):
    projeto = _criar_projeto(cliente)
    dataset = _criar_dataset(cliente, projeto["id"])
    _adicionar_linhas(cliente, dataset["id"])
    campo = _criar_campo(cliente, dataset["id"], "total", "quantidade * custo_unitario")
    resposta = cliente.patch(
        f"/api/datasets/{dataset['id']}/campos-calculados/{campo['id']}",
        json={"formula": "EVIL(col)"},
    )
    assert resposta.status_code == 400


def test_deletar_campo(cliente, admin):
    projeto = _criar_projeto(cliente)
    dataset = _criar_dataset(cliente, projeto["id"])
    _adicionar_linhas(cliente, dataset["id"])
    campo = _criar_campo(cliente, dataset["id"], "total", "quantidade * custo_unitario")
    assert cliente.delete(f"/api/datasets/{dataset['id']}/campos-calculados/{campo['id']}").status_code == 204
    assert cliente.get(f"/api/datasets/{dataset['id']}/campos-calculados").json() == []


def test_cascade_deletar_dataset(cliente, admin):
    projeto = _criar_projeto(cliente)
    dataset = _criar_dataset(cliente, projeto["id"])
    _adicionar_linhas(cliente, dataset["id"])
    _criar_campo(cliente, dataset["id"], "total", "quantidade * custo_unitario")
    assert cliente.delete(f"/api/projetos/{projeto['id']}/datasets/{dataset['id']}").status_code == 204
    assert cliente.get(f"/api/datasets/{dataset['id']}/campos-calculados").status_code == 404


def test_agregador_inclui_campo_calculado(cliente, admin):
    projeto = _criar_projeto(cliente)
    dataset = _criar_dataset(cliente, projeto["id"])
    cliente.post(
        f"/api/datasets/{dataset['id']}/rows",
        json={"rows": [
            {"row_index": 0, "data_json": {"quantidade": 3, "custo_unitario": 10}},
            {"row_index": 1, "data_json": {"quantidade": 2, "custo_unitario": 5}},
        ]},
    )
    _criar_campo(cliente, dataset["id"], "total", "quantidade * custo_unitario")
    resultado = agregador.agregar(str(dataset["id"]), aggregation=None)
    linhas = resultado["rows"]
    assert len(linhas) == 2
    totais = {l["quantidade"]: l["total"] for l in linhas}
    assert totais[3] == 30
    assert totais[2] == 10


def test_campo_calculado_como_field_kpi(cliente, admin):
    projeto = _criar_projeto(cliente)
    dataset = _criar_dataset(cliente, projeto["id"])
    cliente.post(
        f"/api/datasets/{dataset['id']}/rows",
        json={"rows": [
            {"row_index": 0, "data_json": {"quantidade": 3, "custo_unitario": 10}},
            {"row_index": 1, "data_json": {"quantidade": 2, "custo_unitario": 5}},
        ]},
    )
    _criar_campo(cliente, dataset["id"], "total", "quantidade * custo_unitario")
    dashboard = cliente.post(f"/api/projetos/{projeto['id']}/dashboards", json={"nome": "D"}).json()
    widget = cliente.post(
        f"/api/dashboards/{dashboard['id']}/widgets",
        json={"type": "kpi", "dataset_id": str(dataset["id"]),
              "config_json": {"field": "total", "aggregation": "sum"}},
    ).json()
    resposta = cliente.post(f"/api/dashboards/{dashboard['id']}/query", json={"widget_ids": [widget["id"]]})
    assert resposta.status_code == 200
    w = next(w for w in resposta.json()["widgets"] if w["widget_id"] == widget["id"])
    assert w["data"]["value"] == 40  # 30 + 10
