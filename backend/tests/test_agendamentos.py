def _login(cliente, username="admin", senha="admin123456"):
    resposta = cliente.post("/api/auth/login", json={"username": username, "senha": senha})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _criar_projeto(cliente, nome="Projeto Agend"):
    resposta = cliente.post("/api/projetos", json={"nome": nome})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _criar_dashboard(cliente, projeto_id, nome="Dashboard Agend"):
    resposta = cliente.post(f"/api/projetos/{projeto_id}/dashboards", json={"nome": nome})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _publicar(cliente, dbid):
    resposta = cliente.post(f"/api/dashboards/{dbid}/publicar", json={})
    assert resposta.status_code == 200, resposta.text
    import publicacoes_store
    return publicacoes_store.obter_por_token(resposta.json()['token'])


def _criar_agendamento(cliente, publicacao_id, periodicidade="diaria"):
    resposta = cliente.post(
        "/api/agendamentos",
        json={"publicacao_id": publicacao_id, "periodicidade": periodicidade},
    )
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def test_criar_agendamento(cliente, admin):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    pub = _publicar(cliente, dashboard["id"])
    agendamento = _criar_agendamento(cliente, pub["id"], "diaria")
    assert agendamento["id"] > 0
    assert agendamento["periodicidade"] == "diaria"
    assert agendamento["proxima_execucao"]


def test_periodicidade_invalida_400(cliente, admin):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    pub = _publicar(cliente, dashboard["id"])
    resposta = cliente.post(
        "/api/agendamentos",
        json={"publicacao_id": pub["id"], "periodicidade": "anual"},
    )
    assert resposta.status_code == 400


def test_listar_agendamentos(cliente, admin):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    pub = _publicar(cliente, dashboard["id"])
    _criar_agendamento(cliente, pub["id"], "semanal")
    lista = cliente.get("/api/agendamentos").json()
    assert len(lista) == 1
    assert lista[0]["periodicidade"] == "semanal"


def test_atualizar_deletar_agendamento(cliente, admin):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    pub = _publicar(cliente, dashboard["id"])
    agendamento = _criar_agendamento(cliente, pub["id"], "diaria")
    resposta = cliente.patch(
        f"/api/agendamentos/{agendamento['id']}",
        json={"periodicidade": "mensal", "ativo": False},
    )
    assert resposta.status_code == 200
    assert resposta.json()["periodicidade"] == "mensal"
    assert resposta.json()["ativo"] == 0 or resposta.json()["ativo"] is False
    assert cliente.delete(f"/api/agendamentos/{agendamento['id']}").status_code == 204

