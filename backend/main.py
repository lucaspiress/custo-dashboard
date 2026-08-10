import os
import sys
import traceback

_ERRO_BOOT = None
app = None

try:
    from contextlib import asynccontextmanager

    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    import store
    from routers import auth, projetos, users

    def _origens_cors() -> list[str]:
        raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:4173")
        return [o.strip() for o in raw.split(",") if o.strip()]

    @asynccontextmanager
    async def _lifespan(app_: FastAPI):
        if _ERRO_BOOT is None:
            try:
                store.ensure_schema()
            except Exception:
                pass
        yield

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
except Exception:
    _ERRO_BOOT = traceback.format_exc()

if app is None:
    async def app(scope, receive, send):  # noqa: A001
        corpo = ('{"erro_boot": ' + repr(_ERRO_BOOT).replace('"', "'") + '}').encode()
        await send(
            {
                "type": "http.response.start",
                "status": 200,
                "headers": [(b"content-type", b"application/json")],
            }
        )
        await send({"type": "http.response.body", "body": corpo})
