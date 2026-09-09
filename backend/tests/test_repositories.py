import pytest
from repositories import ProjectRepository, ScenarioRepository
import history
import projetos_store


def test_project_repository_sqlite(tmp_path, monkeypatch):
    db_path = str(tmp_path / "test_repo.db")
    monkeypatch.setenv("HISTORICO_DB", db_path)
    monkeypatch.setenv("DATABASE_URL", "")

    conn = history._conexao()
    history._inicializar(conn)
    conn.close()

    # Criar projeto via store e ler via repository
    p_criado = projetos_store.criar_projeto("Projeto Repo Teste", "Cliente Repo")
    p_encontrado = ProjectRepository.buscar_por_id(p_criado["id"])

    assert p_encontrado is not None
    assert p_encontrado["nome"] == "Projeto Repo Teste"
    assert p_encontrado["cliente"] == "Cliente Repo"

    lista = ProjectRepository.listar()
    assert len(lista) >= 1
    assert any(p["id"] == p_criado["id"] for p in lista)


def test_scenario_repository_sqlite(tmp_path, monkeypatch):
    db_path = str(tmp_path / "test_repo_cenarios.db")
    monkeypatch.setenv("HISTORICO_DB", db_path)
    monkeypatch.setenv("DATABASE_URL", "")

    conn = history._conexao()
    history._inicializar(conn)
    conn.close()

    p_criado = projetos_store.criar_projeto("Projeto Cenario Repo")
    c = ScenarioRepository.criar(p_criado["id"], "Cenário Repo Teste", 5.0, -2.5)

    assert c["id"] is not None
    assert c["nome"] == "Cenário Repo Teste"

    cenarios = ScenarioRepository.listar_por_projeto(p_criado["id"])
    assert len(cenarios) == 1
    assert cenarios[0]["nome"] == "Cenário Repo Teste"

    ok = ScenarioRepository.excluir(c["id"])
    assert ok is True
    assert len(ScenarioRepository.listar_por_projeto(p_criado["id"])) == 0
