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


def test_publicar_dashboard(cliente, admin):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    resposta = cliente.post(f"/api/dashboards/{dashboard['id']}/publicar", json={})
    assert resposta.status_code == 200
    pub = resposta.json()
    assert "token" in pub
    assert len(pub["token"]) >= 32
    assert pub["url_publica"] == f"/p/{pub['token']}"


def test_obter_publicacao_nao_expoe_token(cliente, admin):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    pub = _publicar(cliente, dashboard["id"])
    pid = cliente.get(f"/api/publicacoes/{pub['id']}").json()
    assert "token" not in pid
    assert pid["dashboard_id"] == dashboard["id"]


def test_revogar_publicacao(cliente, admin):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    pub = _publicar(cliente, dashboard["id"])
    assert cliente.delete(f"/api/publicacoes/{pub['id']}").status_code == 204
    # após revogar, obter_por_token retorna None
    import publicacoes_store
    assert publicacoes_store.obter_por_token(pub["token"]) is None


def test_publicar_audit_log(cliente, admin):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    _publicar(cliente, dashboard["id"])
    eventos = cliente.get("/api/audit-log").json()
    assert any(e["evento"] == "publicacao" for e in eventos)


def test_revogar_audit_log(cliente, admin):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    pub = _publicar(cliente, dashboard["id"])
    cliente.delete(f"/api/publicacoes/{pub['id']}")
    eventos = cliente.get("/api/audit-log").json()
    assert any(e["evento"] == "revogacao" for e in eventos)


def test_publicar_sem_login_401(cliente):
    assert cliente.post("/api/dashboards/1/publicar", json={}).status_code == 401

