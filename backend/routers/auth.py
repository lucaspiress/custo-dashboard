from fastapi import APIRouter, Depends, HTTPException, Response

import auth
import store
from deps import usuario_atual
from security import definir_cookie, limpar_cookie

router = APIRouter(prefix="/auth", tags=["auth"])


def _payload_usuario(linha: dict) -> dict:
    return {
        "id": int(linha["id"]),
        "username": linha["username"],
        "nome": linha["nome"],
        "papel": linha["papel"],
    }


@router.post("/login")
def login(dados: dict, resposta: Response) -> dict:
    username = str(dados.get("username", "")).strip().lower()
    senha = str(dados.get("senha", ""))
    if not username or not senha:
        raise HTTPException(status_code=400, detail="Informe usuário e senha.")
    usuario = store.get_user_by_username(username)
    if not usuario or not usuario["ativo"] or not auth.verify_password(senha, usuario["senha_hash"], usuario["salt"]):
        raise HTTPException(status_code=401, detail="Usuário ou senha inválidos.")
    definir_cookie(resposta, int(usuario["id"]))
    return _payload_usuario(usuario)


@router.post("/logout")
def logout(resposta: Response) -> dict:
    limpar_cookie(resposta)
    return {"ok": True}


@router.get("/me")
def me(usuario: dict = Depends(usuario_atual)) -> dict:
    return usuario
