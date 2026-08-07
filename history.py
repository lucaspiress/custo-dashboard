import hashlib
import os
import sqlite3
from datetime import datetime

import pandas as pd

PASTA_DADOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
CAMINHO_DB = os.path.join(PASTA_DADOS, "historico.db")


def _conexao() -> sqlite3.Connection:
    os.makedirs(PASTA_DADOS, exist_ok=True)
    conn = sqlite3.connect(CAMINHO_DB)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _inicializar(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sha256 TEXT UNIQUE NOT NULL,
            filename TEXT NOT NULL,
            uploaded_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS locais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            upload_id INTEGER NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
            nome TEXT NOT NULL,
            valor_mensal REAL NOT NULL,
            saldo_mensal REAL NOT NULL,
            investimento REAL NOT NULL,
            equipamento REAL NOT NULL,
            mao_de_obra REAL NOT NULL,
            tempo_retorno REAL,
            meses_retorno INTEGER,
            margem REAL,
            data_inst TEXT
        );
        CREATE TABLE IF NOT EXISTS itens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            upload_id INTEGER NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
            categoria TEXT NOT NULL,
            cod TEXT,
            material TEXT NOT NULL,
            qtd REAL NOT NULL,
            valor_unit REAL NOT NULL,
            valor_total REAL NOT NULL
        );
        """
    )
    conn.commit()


def sha256_de_bytes(dados: bytes) -> str:
    return hashlib.sha256(dados).hexdigest()


def salvar_snapshot(sha256: str, filename: str, locais) -> int:
    conn = _conexao()
    try:
        _inicializar(conn)
        conn.execute("DELETE FROM uploads WHERE sha256 = ?", (sha256,))
        cursor = conn.execute(
            "INSERT INTO uploads (sha256, filename, uploaded_at) VALUES (?, ?, ?)",
            (sha256, filename, datetime.now().isoformat(timespec="seconds")),
        )
        upload_id = cursor.lastrowid
        for local in locais:
            conn.execute(
                """INSERT INTO locais
                   (upload_id, nome, valor_mensal, saldo_mensal, investimento,
                    equipamento, mao_de_obra, tempo_retorno, meses_retorno, margem, data_inst)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    upload_id,
                    local.nome,
                    local.valor_mensal,
                    local.saldo_mensal,
                    local.investimento,
                    local.equipamento,
                    local.mao_de_obra,
                    local.tempo_retorno,
                    _meses_retorno(local),
                    local.margem,
                    local.data_inst.isoformat() if local.data_inst else None,
                ),
            )
            for item in local.itens:
                conn.execute(
                    """INSERT INTO itens
                       (upload_id, categoria, cod, material, qtd, valor_unit, valor_total)
                       VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        upload_id,
                        item.categoria,
                        item.cod,
                        item.material,
                        item.qtd,
                        item.valor_unit,
                        item.valor_total,
                    ),
                )
        conn.commit()
        return upload_id
    finally:
        conn.close()


def _meses_retorno(local) -> int | None:
    if local.saldo_mensal <= 0:
        return None
    import math

    return math.ceil((local.investimento - local.taxa_instalacao) / local.saldo_mensal)


def listar_uploads() -> pd.DataFrame:
    conn = _conexao()
    try:
        _inicializar(conn)
        return pd.read_sql_query(
            "SELECT id, sha256, filename, uploaded_at FROM uploads ORDER BY uploaded_at DESC",
            conn,
        )
    finally:
        conn.close()


def carregar_historico_locais() -> pd.DataFrame:
    conn = _conexao()
    try:
        _inicializar(conn)
        return pd.read_sql_query(
            """SELECT u.id AS upload_id, u.filename, u.uploaded_at, l.nome AS local,
                      l.valor_mensal, l.saldo_mensal, l.investimento, l.equipamento,
                      l.mao_de_obra, l.tempo_retorno, l.meses_retorno, l.margem, l.data_inst
               FROM locais l JOIN uploads u ON u.id = l.upload_id
               ORDER BY u.uploaded_at, l.nome""",
            conn,
        )
    finally:
        conn.close()


def excluir_upload(upload_id: int) -> None:
    conn = _conexao()
    try:
        _inicializar(conn)
        conn.execute("DELETE FROM uploads WHERE id = ?", (upload_id,))
        conn.commit()
    finally:
        conn.close()
