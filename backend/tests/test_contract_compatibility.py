from collections import defaultdict

from main import app


def _rotas_api() -> dict[str, set[str]]:
    rotas: defaultdict[str, set[str]] = defaultdict(set)
    for caminho, operacoes in app.openapi()["paths"].items():
        rotas[caminho].update(metodo.upper() for metodo in operacoes)
    return dict(rotas)


def _afirmar_rotas(esperadas: dict[str, set[str]]) -> None:
    rotas = _rotas_api()
    for caminho, metodos in esperadas.items():
        assert rotas.get(caminho) == metodos, (
            f"Contrato incompatível para {caminho}: "
            f"esperado {sorted(metodos)}, encontrado {sorted(rotas.get(caminho, set()))}"
        )


def test_contratos_de_autenticacao(cliente):
    _afirmar_rotas(
        {
            "/api/health": {"GET"},
            "/api/auth/login": {"POST"},
            "/api/auth/logout": {"POST"},
            "/api/auth/me": {"GET"},
        }
    )


def test_contratos_de_usuarios_administrativos(cliente):
    _afirmar_rotas(
        {
            "/api/users": {"GET", "POST"},
            "/api/users/{user_id}": {"PATCH"},
            "/api/users/{user_id}/reset-password": {"POST"},
        }
    )


def test_contratos_de_projetos(cliente):
    _afirmar_rotas(
        {
            "/api/projetos": {"GET", "POST"},
            "/api/projetos/{projeto_id}": {"GET", "PATCH", "DELETE"},
            "/api/projetos/importar": {"POST"},
            "/api/projetos/{projeto_id}/locais": {"POST"},
            "/api/projetos/{projeto_id}/locais/{local_id}": {"PATCH", "DELETE"},
            "/api/projetos/locais/{local_id}/itens": {"POST"},
            "/api/projetos/itens/{item_id}": {"PATCH", "DELETE"},
            "/api/projetos/{projeto_id}/planilha.xlsx": {"GET"},
            "/api/projetos/{projeto_id}/relatorio": {"POST"},
        }
    )


def test_contratos_de_datasets(cliente):
    _afirmar_rotas(
        {
            "/api/projetos/{projeto_id}/datasets": {"GET", "POST"},
            "/api/projetos/{projeto_id}/datasets/{did}": {"GET", "PATCH", "DELETE"},
            "/api/datasets/{did}/rows": {"GET", "POST"},
            "/api/datasets/{did}/importar": {"POST"},
            "/api/datasets/{did}/export.csv": {"GET"},
            "/api/datasets/{did}/export.xlsx": {"GET"},
            "/api/datasets/{did}/campos-calculados": {"GET", "POST"},
            "/api/datasets/{did}/campos-calculados/{cid}": {"PATCH", "DELETE"},
        }
    )


def test_contratos_de_dashboards_e_compartilhamento(cliente):
    _afirmar_rotas(
        {
            "/api/projetos/{projeto_id}/dashboards": {"GET", "POST"},
            "/api/projetos/{projeto_id}/dashboards/{dbid}": {"GET", "PATCH", "DELETE"},
            "/api/dashboards/{dbid}/widgets": {"POST"},
            "/api/dashboards/{dbid}/widgets/{wid}": {"PATCH", "DELETE"},
            "/api/dashboards/{dbid}/slicers": {"POST"},
            "/api/dashboards/{dbid}/slicers/{sid}": {"DELETE"},
            "/api/dashboards/{dbid}/query": {"POST"},
            "/api/dashboards/{dbid}/publicar": {"POST"},
            "/api/publicacoes/{pid}": {"GET", "DELETE"},
            "/api/dashboards/compartilhados": {"GET"},
            "/p/{token}": {"GET"},
        }
    )


def test_contratos_de_entregas(cliente):
    _afirmar_rotas(
        {
            "/api/agendamentos": {"GET", "POST"},
            "/api/agendamentos/{aid}": {"PATCH", "DELETE"},
            "/api/relatorios": {"GET"},
            "/api/relatorios/{rid}/download": {"GET"},
            "/api/audit-log": {"GET"},
            "/api/cron/relatorios": {"POST"},
        }
    )
