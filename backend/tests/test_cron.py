import os

import agendamentos_store
import publicacoes_store
import relatorios_store


def _login(cliente, username="admin", senha="admin123456"):
    resposta = cliente.post("/api/auth/login", json={"username": username, "senha": senha})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _criar_projeto(cliente, nome="Projeto Cron"):
    resposta = cliente.post("/api/projetos", json={"nome": nome})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _criar_dashboard(cliente, projeto_id, nome="Dashboard Cron"):
    resposta = cliente.post(f"/api/projetos/{projeto_id}/dashboards", json={"nome": nome})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def _publicar(cliente, dbid):
    resposta = cliente.post(f"/api/dashboards/{dbid}/publicar", json={})
    assert resposta.status_code == 200, resposta.text
    import publicacoes_store
    return publicacoes_store.obter_por_token(resposta.json()['token'])


def _criar_agendamento_pendente(cliente, publicacao_id, periodicidade="diaria"):
    resposta = cliente.post(
        "/api/agendamentos",
        json={"publicacao_id": publicacao_id, "periodicidade": periodicidade},
    )
    assert resposta.status_code == 200, resposta.text
    agendamento = resposta.json()
    # força proxima_execucao no passado para o cron encontrar como pendente
    agendamentos_store.atualizar(agendamento["id"], proxima_execucao="2000-01-01T00:00:00")
    return agendamento


def test_cron_unauthorized(cliente, admin, monkeypatch):
    os.environ["CRON_SECRET"] = "segredo-teste"
    resposta = cliente.post("/api/cron/relatorios", headers={"Authorization": "Bearer errado"})
    assert resposta.status_code == 401


def test_cron_processa_pendentes(cliente, admin, monkeypatch):
    os.environ["CRON_SECRET"] = "segredo-teste"
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    pub = _publicar(cliente, dashboard["id"])
    agendamento = _criar_agendamento_pendente(cliente, pub["id"], "diaria")

    import pdf_generator
    import r2_client
    monkeypatch.setattr(r2_client, "upload_pdf", lambda key, content: key)
    monkeypatch.setattr(pdf_generator, "gerar_pdf_dashboard", lambda d, w: b"%PDF")

    resposta = cliente.post("/api/cron/relatorios", headers={"Authorization": "Bearer segredo-teste"})
    assert resposta.status_code == 200
    assert resposta.json()["processados"] == 1

    relatorios = relatorios_store.listar()
    assert len(relatorios) == 1
    assert relatorios[0]["status"] == "gerado"
    assert relatorios[0]["tamanho_bytes"] == 4

    # proxima_execucao atualizada (deixou de ser o valor forçado no passado)
    atualizado = agendamentos_store.obter(agendamento["id"])
    assert atualizado["proxima_execucao"] != "2000-01-01T00:00:00"


def test_cron_registra_falha(cliente, admin, monkeypatch):
    os.environ["CRON_SECRET"] = "segredo-teste"
    projeto = _criar_projeto(cliente)
    dashboard = _criar_dashboard(cliente, projeto["id"])
    pub = _publicar(cliente, dashboard["id"])
    _criar_agendamento_pendente(cliente, pub["id"], "diaria")

    import pdf_generator
    monkeypatch.setattr(pdf_generator, "gerar_pdf_dashboard", lambda d, w: (_ for _ in ()).throw(RuntimeError("boom")))

    resposta = cliente.post("/api/cron/relatorios", headers={"Authorization": "Bearer segredo-teste"})
    assert resposta.status_code == 200
    relatorios = relatorios_store.listar()
    assert len(relatorios) == 1
    assert relatorios[0]["status"] == "falha"

