from fastapi import Depends, HTTPException, Request

import projetos_store
import store
from security import SESSION_COOKIE, ler_token


def usuario_atual(request: Request) -> dict:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Sessão expirada. Entre novamente.")
    user_id = ler_token(token)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Sessão inválida. Entre novamente.")
    usuario = store.get_user(user_id)
    if not usuario or not usuario["ativo"]:
        raise HTTPException(status_code=401, detail="Usuário desativado ou inexistente.")
    return {
        "id": int(usuario["id"]),
        "username": usuario["username"],
        "nome": usuario["nome"],
        "papel": usuario["papel"],
    }


def admin_obrigatorio(usuario: dict = Depends(usuario_atual)) -> dict:
    if usuario["papel"] != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito a administradores.")
    return usuario


def pode_acessar_projeto(usuario: dict, projeto: dict) -> bool:
    """Admin e 'usuario' (consultor) acessam qualquer projeto.
    'cliente' só acessa projetos em que cliente_usuario_id == user.id."""
    if usuario["papel"] in ("admin", "usuario"):
        return True
    if usuario["papel"] == "cliente":
        return projeto.get("cliente_usuario_id") == usuario["id"]
    return False


def exigir_projeto(usuario: dict, projeto_id: int) -> dict:
    projeto = projetos_store.get_projeto(projeto_id)
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    if not pode_acessar_projeto(usuario, projeto):
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    return projeto
