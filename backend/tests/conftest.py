import os
import tempfile

import pytest

os.environ.setdefault("DATABASE_URL", "")

from fastapi.testclient import TestClient

import history
import store
from main import app


@pytest.fixture()
def cliente():
    store.MODO = "sqlite"
    tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    history.CAMINHO_DB = tmp_db.name
    store.ensure_schema()
    with TestClient(app) as client:
        yield client


@pytest.fixture()
def admin(cliente):
    resposta = cliente.post("/api/auth/login", json={"username": "admin", "senha": "admin123456"})
    assert resposta.status_code == 200
    return resposta.json()
