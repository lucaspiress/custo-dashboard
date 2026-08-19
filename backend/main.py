import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

import store
from routers import (
    agendamentos,
    audit_log,
    auth,
    campos_calculados,
    compartilhados,
    cron,
    dashboards,
    datasets,
    projetos,
    publicacoes,
    publico,
    relatorios,
    users,
)


def _origens_cors() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:4173")
    return [o.strip() for o in raw.split(",") if o.strip()]


@asynccontextmanager
async def _lifespan(app: FastAPI):
    try:
        store.ensure_schema()
    except Exception:
        pass
    yield


def criar_app() -> FastAPI:
    app = FastAPI(title="Custo Dashboard API", version="3.0.0", lifespan=_lifespan)

    app.state.limiter = publico.limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origens_cors(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    def health() -> dict:
        return {"ok": True, "modo": store.modo_atual(), "versao": 3}

    app.include_router(auth.router, prefix="/api")
    app.include_router(users.router, prefix="/api")
    app.include_router(projetos.router, prefix="/api")
    app.include_router(datasets.router)
    app.include_router(dashboards.router)
    app.include_router(campos_calculados.router)
    app.include_router(publicacoes.router)
    app.include_router(agendamentos.router)
    app.include_router(relatorios.router)
    app.include_router(audit_log.router)
    app.include_router(compartilhados.router)
    app.include_router(cron.router)
    app.include_router(publico.router)
    return app


app = criar_app()
