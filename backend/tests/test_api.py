from fixtures import planilha_base, planilha_revisada


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
    upload_id = dados["id"]
    assert upload_id > 0

    analise = cliente.get(f"/api/uploads/{upload_id}").json()
    assert len(analise["locais"]) == 2
    sesc = next(l for l in analise["locais"] if l["nome"] == "SESC TESTE")
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


def test_projeto(cliente, admin):
    dados = _enviar(cliente, planilha_base())
    projeto = cliente.get(f"/api/uploads/{dados['id']}/project").json()
    assert projeto["totais"]["num_locais"] == 2
    assert projeto["totais"]["receita_mensal"] == 16000
    assert projeto["totais"]["num_itens"] == 5
    assert "investimento" in projeto["graficos"]
    assert "dispersao" in projeto["graficos"]


def test_cashflow(cliente, admin):
    dados = _enviar(cliente, planilha_base())
    fluxo = cliente.get(f"/api/uploads/{dados['id']}/cashflow", params={"meses": 24, "local": "SESC TESTE"}).json()
    assert fluxo["meses"] == 24
    assert len(fluxo["pontos"]) == 24
    assert fluxo["grafico"].startswith("{")


def test_comparar_versoes(cliente, admin):
    base = _enviar(cliente, planilha_base())
    rev = _enviar(cliente, planilha_revisada(), nome="planilha_v2.xlsx")
    comparacao = cliente.get(
        f"/api/uploads/{rev['id']}/compare", params={"vs": base["id"], "local": "SESC TESTE"}
    ).json()
    tipos = {i["tipo"] for i in comparacao["itens"]}
    assert "preco" in tipos
    assert "quantidade" in tipos
    assert "adicionado" in tipos
    assert "removido" in tipos
    central = next(i for i in comparacao["itens"] if i["material"] == "Central de alarme")
    assert central["valor_unit_antes"] == 1500
    assert central["valor_unit_depois"] == 1600
    investimento = next(k for k in comparacao["kpis"] if k["rotulo"] == "Investimento")
    assert investimento["depois"] - investimento["antes"] == (1600 + 10 * 120 + 4 * 850 + 700) - (1500 + 8 * 120 + 4 * 850 + 1400)


def test_pdf_e_excel(cliente, admin):
    dados = _enviar(cliente, planilha_base())
    pdf = cliente.get(f"/api/uploads/{dados['id']}/report")
    assert pdf.status_code == 200
    assert pdf.content[:4] == b"%PDF"
    xlsx = cliente.get(f"/api/uploads/{dados['id']}/export")
    assert xlsx.status_code == 200
    assert xlsx.content[:2] == b"PK"


def test_isolamento_entre_usuarios(cliente, admin):
    cliente.post(
        "/api/users",
        json={"nome": "Segundo Usuário", "username": "usuario2", "senha": "senha12345", "papel": "usuario"},
    )
    admin_id = admin["id"]

    dados_admin = _enviar(cliente, planilha_base(), nome="do_admin.xlsx")
    ids_admin = [u["id"] for u in cliente.get("/api/uploads").json()]
    assert dados_admin["id"] in ids_admin

    cliente.post("/api/auth/logout")
    usuario = cliente.post("/api/auth/login", json={"username": "usuario2", "senha": "senha12345"}).json()
    assert usuario["id"] != admin_id
    uploads_usuario2 = cliente.get("/api/uploads").json()
    assert uploads_usuario2 == []
    assert cliente.get(f"/api/uploads/{dados_admin['id']}").status_code == 404


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
