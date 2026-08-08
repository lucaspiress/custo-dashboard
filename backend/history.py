import os
import sqlite3
from datetime import datetime

import auth

PASTA_DADOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
CAMINHO_DB = os.getenv("HISTORICO_DB") or os.path.join(PASTA_DADOS, "historico.db")


def _conexao() -> sqlite3.Connection:
    os.makedirs(PASTA_DADOS, exist_ok=True)
    conn = sqlite3.connect(CAMINHO_DB)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _inicializar(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        DROP TABLE IF EXISTS itens;
        DROP TABLE IF EXISTS locais;
        DROP TABLE IF EXISTS uploads;

        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            nome TEXT NOT NULL,
            senha_hash TEXT NOT NULL,
            salt TEXT NOT NULL,
            papel TEXT NOT NULL DEFAULT 'usuario',
            ativo INTEGER NOT NULL DEFAULT 1,
            criado_em TEXT NOT NULL
        );
        """
    )
    conn.commit()


def seed_admin_local() -> None:
    conn = _conexao()
    try:
        _inicializar(conn)
        if conn.execute("SELECT count(*) FROM usuarios").fetchone()[0] > 0:
            return
        senha = os.getenv("ADMIN_INITIAL_PASSWORD", "admin123456")
        senha_hash, salt = auth.password_hash(senha)
        conn.execute(
            "INSERT INTO usuarios (username, nome, senha_hash, salt, papel, criado_em) VALUES (?, ?, ?, ?, 'admin', ?)",
            ("admin", "Administrador Local", senha_hash, salt, datetime.now().isoformat(timespec="seconds")),
        )
        conn.commit()
        print(
            "Aviso: usuário local 'admin' criado automaticamente no modo SQLite. "
            "Defina ADMIN_INITIAL_PASSWORD para trocar a senha inicial."
        )
    finally:
        conn.close()


def get_user_by_username(username: str) -> dict | None:
    conn = _conexao()
    try:
        _inicializar(conn)
        return conn.execute(
            "SELECT id, username, nome, senha_hash, salt, papel, ativo, criado_em FROM usuarios WHERE username = ?",
            (username.strip().lower(),),
        ).fetchone()
    finally:
        conn.close()


def get_user(user_id: int) -> dict | None:
    conn = _conexao()
    try:
        _inicializar(conn)
        return conn.execute(
            "SELECT id, username, nome, papel, ativo, criado_em FROM usuarios WHERE id = ?",
            (user_id,),
        ).fetchone()
    finally:
        conn.close()


def count_admins() -> int:
    conn = _conexao()
    try:
        _inicializar(conn)
        return int(conn.execute("SELECT count(*) FROM usuarios WHERE papel = 'admin'").fetchone()[0])
    finally:
        conn.close()


def list_users() -> list[dict]:
    conn = _conexao()
    try:
        _inicializar(conn)
        return list(
            conn.execute("SELECT id, username, nome, papel, ativo, criado_em FROM usuarios ORDER BY criado_em, id")
        )
    finally:
        conn.close()


def create_user(username: str, nome: str, senha_hash: str, salt: str, papel: str) -> int:
    conn = _conexao()
    try:
        _inicializar(conn)
        cursor = conn.execute(
            "INSERT INTO usuarios (username, nome, senha_hash, salt, papel, criado_em) VALUES (?, ?, ?, ?, ?, ?)",
            (username.strip().lower(), nome.strip(), senha_hash, salt, papel, datetime.now().isoformat(timespec="seconds")),
        )
        conn.commit()
        return int(cursor.lastrowid)
    finally:
        conn.close()


def set_user_active(user_id: int, ativo: bool) -> None:
    conn = _conexao()
    try:
        _inicializar(conn)
        conn.execute("UPDATE usuarios SET ativo = ? WHERE id = ?", (1 if ativo else 0, user_id))
        conn.commit()
    finally:
        conn.close()


def reset_password(user_id: int, senha_hash: str, salt: str) -> None:
    conn = _conexao()
    try:
        _inicializar(conn)
        conn.execute("UPDATE usuarios SET senha_hash = ?, salt = ? WHERE id = ?", (senha_hash, salt, user_id))
        conn.commit()
    finally:
        conn.close()
