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

        CREATE TABLE IF NOT EXISTS projetos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            cliente TEXT,
            cliente_usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
            criado_em TEXT NOT NULL
        );
        """
    )
    _migrar_tabelas_legadas(conn)
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS locais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            projeto_id INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
            nome TEXT NOT NULL,
            valor_mensal REAL NOT NULL DEFAULT 0,
            taxa_instalacao REAL NOT NULL DEFAULT 0,
            custo_manutencao REAL NOT NULL DEFAULT 0,
            mensal_terceirizada REAL NOT NULL DEFAULT 0,
            chip_mensal REAL NOT NULL DEFAULT 0,
            custos_softwares REAL NOT NULL DEFAULT 0,
            mao_de_obra REAL NOT NULL DEFAULT 0,
            data_inst TEXT
        );

        CREATE TABLE IF NOT EXISTS itens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            local_id INTEGER NOT NULL REFERENCES locais(id) ON DELETE CASCADE,
            categoria TEXT NOT NULL,
            cod TEXT,
            material TEXT NOT NULL,
            qtd REAL NOT NULL DEFAULT 0,
            valor_unit REAL NOT NULL DEFAULT 0,
            valor_total REAL NOT NULL DEFAULT 0
        );
        """
    )
    conn.commit()


def _migrar_tabelas_legadas(conn: sqlite3.Connection) -> None:
    """Remove tabelas do formato antigo (uploads/locais/itens com upload_id),
    preservando tabelas no formato atual (projetos/locais/itens)."""
    colunas_locais = {linha[1] for linha in conn.execute("PRAGMA table_info(locais)")}
    if colunas_locais and "projeto_id" not in colunas_locais:
        conn.execute("DROP TABLE itens")
        conn.execute("DROP TABLE locais")
    colunas_itens = {linha[1] for linha in conn.execute("PRAGMA table_info(itens)")}
    if colunas_itens and "upload_id" in colunas_itens:
        conn.execute("DROP TABLE itens")
    conn.execute("DROP TABLE IF EXISTS uploads")
    colunas_projetos = {linha[1] for linha in conn.execute("PRAGMA table_info(projetos)")}
    if colunas_projetos and "cliente_usuario_id" not in colunas_projetos:
        conn.execute("ALTER TABLE projetos ADD COLUMN cliente_usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL")


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
