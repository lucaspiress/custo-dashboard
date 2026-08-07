import store
from fastapi import APIRouter, Depends, HTTPException

import auth
import config
from deps import admin_obrigatorio

router = APIRouter(prefix="/users", tags=["users"])


def _payload(linha: dict) -> dict:
    return {
        "id": int(linha["id"]),
        "username": linha["username"],
        "nome": linha["nome"],
        "papel": linha["papel"],
        "ativo": bool(linha["ativo"]),
    }


@router.get("")
def listar(_: dict = Depends(admin_obrigatorio)) -> list[dict]:
    return [_payload(u) for u in store.list_users()]


@router.post("")
def criar(dados: dict, _: dict = Depends(admin_obrigatorio)) -> dict:
    nome = str(dados.get("nome", "")).strip()
    username = str(dados.get("username", "")).strip().lower()
    senha = str(dados.get("senha", ""))
    papel = str(dados.get("papel", "usuario"))
    if not nome or not username or len(senha) < 8:
        raise HTTPException(status_code=400, detail="Informe nome, usuário e uma senha com pelo menos 8 caracteres.")
    if papel not in ("admin", "usuario"):
        raise HTTPException(status_code=400, detail="Perfil inválido.")
    if papel == "admin" and store.count_admins() >= config.MAX_ADMINS:
        raise HTTPException(status_code=400, detail=f"O limite de {config.MAX_ADMINS} administradores já foi atingido.")
    if store.get_user_by_username(username):
        raise HTTPException(status_code=400, detail="Esse usuário já existe.")
    senha_hash, salt = auth.password_hash(senha)
    user_id = store.create_user(username, nome, senha_hash, salt, papel)
    return _payload(store.get_user(user_id))


@router.patch("/{user_id}")
def atualizar(user_id: int, dados: dict, _: dict = Depends(admin_obrigatorio)) -> dict:
    usuario = store.get_user(user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    if "ativo" in dados:
        store.set_user_active(user_id, bool(dados["ativo"]))
    return _payload(store.get_user(user_id))


@router.post("/{user_id}/reset-password")
def redefinir_senha(user_id: int, dados: dict, _: dict = Depends(admin_obrigatorio)) -> dict:
    senha = str(dados.get("senha", ""))
    if len(senha) < 8:
        raise HTTPException(status_code=400, detail="A senha precisa ter pelo menos 8 caracteres.")
    usuario = store.get_user(user_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    senha_hash, salt = auth.password_hash(senha)
    store.reset_password(user_id, senha_hash, salt)
    return {"ok": True}
