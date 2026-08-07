import os
from datetime import datetime, timedelta, timezone

import jwt

from fastapi import Response

SESSION_COOKIE = "custo_session"
SESSION_TTL = timedelta(days=7)


def _secret() -> str:
    segredo = os.getenv("SESSION_SECRET", "")
    if len(segredo) < 32:
        print("Aviso: SESSION_SECRET ausente ou curta — usando segredo de desenvolvimento.")
        return "dev-secret-change-me-0123456789abcdef"
    return segredo


def _producao() -> bool:
    return os.getenv("RENDER") == "true" or os.getenv("VERCEL") == "true"


def criar_token(user_id: int) -> str:
    agora = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": str(user_id), "iat": agora, "exp": agora + SESSION_TTL},
        _secret(),
        algorithm="HS256",
    )


def ler_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, _secret(), algorithms=["HS256"])
        return int(payload["sub"])
    except Exception:
        return None


def definir_cookie(resposta: Response, user_id: int) -> None:
    resposta.set_cookie(
        SESSION_COOKIE,
        criar_token(user_id),
        max_age=int(SESSION_TTL.total_seconds()),
        httponly=True,
        secure=_producao(),
        samesite="lax",
        path="/",
    )


def limpar_cookie(resposta: Response) -> None:
    resposta.delete_cookie(SESSION_COOKIE, path="/")
