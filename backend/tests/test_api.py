from fixtures import planilha_base


def _enviar(cliente, planilha, nome="planilha.xlsx"):
    resposta = cliente.post(
        "/api/uploads",
        files={"arquivo": (nome, planilha.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def test_health(cliente):
    resposta = cliente.get("/api/health")
    assert resposta.status_code == 200
    assert resposta.json()["ok"] is True


def test_login_errado(cliente):
    resposta = cliente.post("/api/auth/login", json={"username": "admin", "senha": "senha-errada"})
    assert resposta.status_code == 401


def test_me_sem_sessao(cliente):
    assert cliente.get("/api/auth/me").status_code == 401


def test_upload_e_analise(cliente, admin):
    dados = _enviar(cliente, planilha_base())
    assert dados["filename"] == "planilha.xlsx"
    assert len(dados["locais"]) == 2
    sesc = next(l for l in dados["locais"] if l["nome"] == "SESC TESTE")
    assert sesc["resumo"]["valor_mensal"] == 10000
    assert sesc["resumo"]["impostos"] == 1500
    assert sesc["resumo"]["saldo_mensal"] == 8500
    equip_esperado = 1500 + 8 * 120 + 4 * 850 + 1400
    assert sesc["resumo"]["equipamento"] == equip_esperado
    assert sesc["resumo"]["investimento"] == 2000 + equip_esperado
    assert len(sesc["itens"]) == 4
    assert len(sesc["insights"]) > 0
    assert sesc["graficos"]["pareto"].startswith("{")
    assert sesc["graficos"]["payback"].startswith("{")


def test_projeto_no_payload(cliente, admin):
    dados = _enviar(cliente, planilha_base())
    projeto = dados["projeto"]
    assert projeto["totais"]["num_locais"] == 2
    assert projeto["totais"]["receita_mensal"] == 16000
    assert projeto["totais"]["num_itens"] == 5
    assert "investimento" in projeto["graficos"]
    assert "dispersao" in projeto["graficos"]


def test_cashflow_no_payload(cliente, admin):
    dados = _enviar(cliente, planilha_base())
    sesc = next(l for l in dados["locais"] if l["nome"] == "SESC TESTE")
    fluxo = sesc["fluxo"]["24"]
    assert fluxo["meses"] == 24
    assert len(fluxo["pontos"]) == 24
    assert fluxo["grafico"].startswith("{")
    assert len({l["fluxo"][h]["meses"] for l in dados["locais"] for h in ("6", "12", "24", "36")}) == 4


def test_pdf_e_excel(cliente, admin):
    dados = _enviar(cliente, planilha_base())
    payload = {
        "filename": dados["filename"],
        "locais": [
            {"nome": l["nome"], "resumo": l["resumo"], "itens": l["itens"]}
            for l in dados["locais"]
        ],
    }
    pdf = cliente.post("/api/uploads/report", json=payload)
    assert pdf.status_code == 200
    assert pdf.content[:4] == b"%PDF"
    xlsx = cliente.post("/api/uploads/export", json=payload)
    assert xlsx.status_code == 200
    assert xlsx.content[:2] == b"PK"


def test_upload_sem_sessao(cliente):
    resposta = cliente.post(
        "/api/uploads",
        files={"arquivo": ("p.xlsx", b"nao-e-xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert resposta.status_code == 401


def test_admin_limita_usuarios(cliente, admin):
    cliente.post("/api/users", json={"nome": "A", "username": "a", "senha": "senha12345", "papel": "admin"})
    cliente.post("/api/users", json={"nome": "B", "username": "b", "senha": "senha12345", "papel": "admin"})
    resposta = cliente.post(
        "/api/users", json={"nome": "C", "username": "c", "senha": "senha12345", "papel": "admin"}
    )
    assert resposta.status_code == 400


def test_usuario_comum_sem_acesso_admin(cliente, admin):
    cliente.post(
        "/api/users", json={"nome": "Comum", "username": "comum", "senha": "senha12345", "papel": "usuario"}
    )
    cliente.post("/api/auth/logout")
    cliente.post("/api/auth/login", json={"username": "comum", "senha": "senha12345"})
    assert cliente.get("/api/users").status_code == 403
