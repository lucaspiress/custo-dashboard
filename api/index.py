import os
import sys
import traceback

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

try:
    from main import app as app  # noqa: E402
except Exception:
    _erro_boot = traceback.format_exc()

    from fastapi import FastAPI

    app = FastAPI()

    @app.api_route("/{caminho:path}", methods=["GET", "POST", "PATCH", "PUT", "DELETE"])
    def _debug_boot(caminho: str):  # noqa: ARG001
        return {"erro_boot": _erro_boot}

handler = app
