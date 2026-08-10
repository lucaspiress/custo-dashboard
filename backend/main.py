import os
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

_ERRO_BOOT = None

try:
    import store
    from routers import auth, projetos, users
except Exception:
    store = None
    auth = users = None
    projetos = None
    _ERRO_BOOT = traceback.format_exc()


def _origens_cors() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:4173")
    return [o.strip() for o in raw.split(",") if o.strip()]


@asynccontextmanager
async def _lifespan(app: FastAPI):
    if store is not None and _ERRO_BOOT is None:
        store.ensure_schema()
    yield


def criar_app() -> FastAPI:
    app = FastAPI(title="Custo Dashboard API", version="3.0.0", lifespan=_lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origens_cors(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    if _ERRO_BOOT is not None:
        @app.api_route("/{caminho:path}", methods=["GET", "POST", "PATCH", "PUT", "DELETE"])
        def _erro_boot(caminho: str = ""):  # noqa: ARG001
            return {"erro_boot": _ERRO_BOOT}

        return app

    @app.get("/api/health")
    def health() -> dict:
        return {"ok": True, "modo": store.modo_atual(), "versao": 3}

    app.include_router(auth.router, prefix="/api")
    app.include_router(users.router, prefix="/api")
    app.include_router(projetos.router, prefix="/api")
    return app


app = criar_app()
