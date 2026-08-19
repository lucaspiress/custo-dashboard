import audit_store


def _login(cliente, username="admin", senha="admin123456"):
    resposta = cliente.post("/api/auth/login", json={"username": username, "senha": senha})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def test_registrar_e_listar(cliente, admin):
    audit_store.registrar("teste_evento", admin["id"], 1, "dashboard", {"k": "v"})
    audit_store.registrar("outro_evento", admin["id"], 2, "dashboard")
    lista = cliente.get("/api/audit-log").json()
    assert len(lista) == 2
    assert any(e["evento"] == "teste_evento" for e in lista)


def test_filtrar_por_evento(cliente, admin):
    audit_store.registrar("evento_a", admin["id"], 1, "dashboard")
    audit_store.registrar("evento_b", admin["id"], 2, "dashboard")
    lista = cliente.get("/api/audit-log?evento=evento_a").json()
    assert len(lista) == 1
    assert lista[0]["evento"] == "evento_a"


def test_metadata_json(cliente, admin):
    audit_store.registrar("evento_meta", admin["id"], 1, "dashboard", {"campo": "valor"})
    lista = cliente.get("/api/audit-log?evento=evento_meta").json()
    assert lista[0]["metadata_json"]["campo"] == "valor"


def test_audit_sem_login_401(cliente):
    assert cliente.get("/api/audit-log").status_code == 401
