from fastapi import Depends, HTTPException, Request

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
