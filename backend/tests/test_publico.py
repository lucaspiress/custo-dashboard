def _login(cliente, username="admin", senha="admin123456"):
    resposta = cliente.post("/api/auth/login", json={"username": username, "senha": senha})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _criar_projeto(cliente, nome="Projeto Pub"):
    resposta = cliente.post("/api/projetos", json={"nome": nome})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _criar_dashboard(cliente, projeto_id, nome="Dashboard Pub"):
    resposta = cliente.post(f"/api/projetos/{projeto_id}/dashboards", json={"nome": nome})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _publicar(cliente, dbid):
    resposta = cliente.post(f"/api/dashboards/{dbid}/publicar", json={})
    assert resposta.status_code == 200, resposta.text
    import publicacoes_store
    return publicacoes_store.obter_por_token(resposta.json()['token'])


def test_publico_sem_login(cliente, admin):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    pub = _publicar(cliente, dashboard["id"])
    # sem login (cliente fixture não logado)
    resposta = cliente.get(f"/p/{pub['token']}")
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["dashboard"]["nome"] == "Dashboard Pub"
    assert len(corpo["widgets"]) == 2


def test_publico_token_invalido_404(cliente):
    assert cliente.get("/p/token-invalido").status_code == 404


def test_publico_token_revogado_404(cliente, admin):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    pub = _publicar(cliente, dashboard["id"])
    cliente.delete(f"/api/publicacoes/{pub['id']}")
    assert cliente.get(f"/p/{pub['token']}").status_code == 404


def test_publico_rate_limit(cliente, admin):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    pub = _publicar(cliente, dashboard["id"])
    # faz várias requisições até estourar o limite de 60/min
    statuses = []
    for _ in range(70):
        statuses.append(cliente.get(f"/p/{pub['token']}").status_code)
    assert 429 in statuses

