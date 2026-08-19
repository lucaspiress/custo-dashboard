import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import store
from routers import auth, campos_calculados, dashboards, datasets, projetos, users


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
    return app


app = criar_app()
