import relatorios_store


def _login(cliente, username="admin", senha="admin123456"):
    resposta = cliente.post("/api/auth/login", json={"username": username, "senha": senha})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _criar_projeto(cliente, nome="Projeto Rel"):
    resposta = cliente.post("/api/projetos", json={"nome": nome})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _criar_dashboard(cliente, projeto_id, nome="Dashboard Rel"):
    resposta = cliente.post(f"/api/projetos/{projeto_id}/dashboards", json={"nome": nome})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _publicar(cliente, dbid):
    resposta = cliente.post(f"/api/dashboards/{dbid}/publicar", json={})
    assert resposta.status_code == 200, resposta.text
    import publicacoes_store
    return publicacoes_store.obter_por_token(resposta.json()['token'])


def test_listar_relatorios(cliente, admin):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    pub = _publicar(cliente, dashboard["id"])
    relatorios_store.criar(pub["id"], None, "relatorios/dashboard-1/x.pdf", 1234)
    lista = cliente.get("/api/relatorios").json()
    assert len(lista) == 1
    assert lista[0]["storage_key"] == "relatorios/dashboard-1/x.pdf"
    assert lista[0]["tamanho_bytes"] == 1234


def test_download_relatorio_mock_r2(cliente, admin, monkeypatch):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    pub = _publicar(cliente, dashboard["id"])
    relatorio = relatorios_store.criar(pub["id"], None, "relatorios/dashboard-1/x.pdf", 4)

    import r2_client
    monkeypatch.setattr(r2_client, "download_pdf", lambda key: b"%PDF")

    resposta = cliente.get(f"/api/relatorios/{relatorio['id']}/download")
    assert resposta.status_code == 200
    assert resposta.content == b"%PDF"
    assert resposta.headers["content-type"] == "application/pdf"


def test_download_registra_audit(cliente, admin, monkeypatch):
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    pub = _publicar(cliente, dashboard["id"])
    relatorio = relatorios_store.criar(pub["id"], None, "relatorios/dashboard-1/x.pdf", 4)

    import r2_client
    monkeypatch.setattr(r2_client, "download_pdf", lambda key: b"%PDF")

    cliente.get(f"/api/relatorios/{relatorio['id']}/download")
    eventos = cliente.get("/api/audit-log").json()
    assert any(e["evento"] == "download_relatorio" for e in eventos)

