def _login(cliente, username="admin", senha="admin123456"):
    resposta = cliente.post("/api/auth/login", json={"username": username, "senha": senha})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _criar_projeto(cliente, nome="Projeto Comp"):
    resposta = cliente.post("/api/projetos", json={"nome": nome})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def test_listar_compartilhados(cliente, admin):
    projeto = _criar_projeto(cliente)
    cliente.post(f"/api/projetos/{projeto['id']}/dashboards", json={"nome": "Interno", "eh_interno": True})
    cliente.post(f"/api/projetos/{projeto['id']}/dashboards", json={"nome": "Privado"})
    lista = cliente.get("/api/dashboards/compartilhados").json()
    assert len(lista) == 1
    assert lista[0]["nome"] == "Interno"
    assert lista[0]["eh_interno"] is True
    assert "widgets_count" in lista[0]


def test_compartilhados_sem_login_401(cliente):
    assert cliente.get("/api/dashboards/compartilhados").status_code == 401
