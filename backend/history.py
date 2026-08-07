import hashlib
import os
import sqlite3
from datetime import datetime

import auth
import config
import loader

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
        """
    )
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
            sha256 TEXT UNIQUE NOT NULL,
            filename TEXT NOT NULL,
            uploaded_at TEXT NOT NULL
        );"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS locais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            upload_id INTEGER NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
            nome TEXT NOT NULL,
            valor_mensal REAL NOT NULL,
            taxa_instalacao REAL NOT NULL DEFAULT 0,
            custo_manutencao REAL NOT NULL DEFAULT 0,
            mensal_terceirizada REAL NOT NULL DEFAULT 0,
            chip_mensal REAL NOT NULL DEFAULT 0,
            custos_softwares REAL NOT NULL DEFAULT 0,
            saldo_mensal REAL NOT NULL,
            investimento REAL NOT NULL,
            equipamento REAL NOT NULL,
            mao_de_obra REAL NOT NULL,
            tempo_retorno REAL,
            meses_retorno INTEGER,
            margem REAL,
            data_inst TEXT
        );"""
    )
    conn.execute(
        """CREATE TABLE IF NOT EXISTS itens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            upload_id INTEGER NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
            local_id INTEGER REFERENCES locais(id) ON DELETE CASCADE,
            categoria TEXT NOT NULL,
            cod TEXT,
            material TEXT NOT NULL,
            qtd REAL NOT NULL,
            valor_unit REAL NOT NULL,
            valor_total REAL NOT NULL
        );"""
    )
    colunas_uploads = {linha[1] for linha in conn.execute("PRAGMA table_info(uploads)")}
    if "user_id" not in colunas_uploads:
        conn.execute("ALTER TABLE uploads ADD COLUMN user_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE")
    colunas_itens = {linha[1] for linha in conn.execute("PRAGMA table_info(itens)")}
    if "local_id" not in colunas_itens:
        conn.execute("ALTER TABLE itens ADD COLUMN local_id INTEGER REFERENCES locais(id) ON DELETE CASCADE")
    colunas_existentes = {linha[1] for linha in conn.execute("PRAGMA table_info(locais)")}
    colunas_novas = {
        "taxa_instalacao": "REAL NOT NULL DEFAULT 0",
        "custo_manutencao": "REAL NOT NULL DEFAULT 0",
        "mensal_terceirizada": "REAL NOT NULL DEFAULT 0",
        "chip_mensal": "REAL NOT NULL DEFAULT 0",
        "custos_softwares": "REAL NOT NULL DEFAULT 0",
    }
    for coluna, definicao in colunas_novas.items():
        if coluna not in colunas_existentes:
            conn.execute(f"ALTER TABLE locais ADD COLUMN {coluna} {definicao}")
    conn.commit()


def sha256_de_bytes(dados: bytes) -> str:
    return hashlib.sha256(dados).hexdigest()


def seed_admin_local() -> None:
    conn = _conexao()
    try:
        _inicializar(conn)
        if conn.execute("SELECT count(*) FROM usuarios").fetchone()[0] > 0:
            return
        senha = os.getenv("ADMIN_INITIAL_PASSWORD", "admin123456")
        senha_hash, salt = auth.password_hash(senha)
        cursor = conn.execute(
            "INSERT INTO usuarios (username, nome, senha_hash, salt, papel, criado_em) VALUES (?, ?, ?, ?, 'admin', ?)",
            ("admin", "Administrador Local", senha_hash, salt, datetime.now().isoformat(timespec="seconds")),
        )
        _adotar_uploads_legados(conn, int(cursor.lastrowid))
        conn.commit()
        print(
            "Aviso: usuário local 'admin' criado automaticamente no modo SQLite. "
            "Defina ADMIN_INITIAL_PASSWORD para trocar a senha inicial."
        )
    finally:
        conn.close()


def _adotar_uploads_legados(conn: sqlite3.Connection, user_id: int) -> None:
    conn.execute("UPDATE uploads SET user_id = ? WHERE user_id IS NULL", (user_id,))


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


def salvar_snapshot(user_id: int, sha256: str, filename: str, locais) -> int:
    conn = _conexao()
    try:
        _inicializar(conn)
        conn.execute("DELETE FROM uploads WHERE sha256 = ?", (sha256,))
        cursor = conn.execute(
            "INSERT INTO uploads (user_id, sha256, filename, uploaded_at) VALUES (?, ?, ?, ?)",
            (user_id, sha256, filename, datetime.now().isoformat(timespec="seconds")),
        )
        upload_id = cursor.lastrowid
        for local in locais:
            local_cursor = conn.execute(
                """INSERT INTO locais
                   (upload_id, nome, valor_mensal, taxa_instalacao, custo_manutencao,
                    mensal_terceirizada, chip_mensal, custos_softwares,
                    saldo_mensal, investimento, equipamento, mao_de_obra,
                    tempo_retorno, meses_retorno, margem, data_inst)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    upload_id,
                    local.nome,
                    local.valor_mensal,
                    local.taxa_instalacao,
                    local.custo_manutencao,
                    local.mensal_terceirizada,
                    local.chip_mensal,
                    local.custos_softwares,
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
            local_id = int(local_cursor.lastrowid)
            for item in local.itens:
                conn.execute(
                    """INSERT INTO itens
                       (upload_id, local_id, categoria, cod, material, qtd, valor_unit, valor_total)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        upload_id,
                        local_id,
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


def listar_uploads(user_id: int) -> list[dict]:
    conn = _conexao()
    try:
        _inicializar(conn)
        linhas = conn.execute(
            "SELECT id, sha256, filename, uploaded_at FROM uploads WHERE user_id = ? ORDER BY uploaded_at DESC, id DESC",
            (user_id,),
        ).fetchall()
        return [dict(linha) for linha in linhas]
    finally:
        conn.close()


def carregar_historico_locais(user_id: int) -> list[dict]:
    conn = _conexao()
    try:
        _inicializar(conn)
        linhas = conn.execute(
            """SELECT u.id AS upload_id, u.filename, u.uploaded_at, l.nome AS local,
                      l.valor_mensal, l.saldo_mensal, l.investimento, l.equipamento,
                      l.mao_de_obra, l.tempo_retorno, l.meses_retorno, l.margem, l.data_inst
               FROM locais l JOIN uploads u ON u.id = l.upload_id
               WHERE u.user_id = ?
               ORDER BY u.uploaded_at, l.nome""",
            (user_id,),
        ).fetchall()
        return [dict(linha) for linha in linhas]
    finally:
        conn.close()


def excluir_upload(user_id: int, upload_id: int) -> None:
    conn = _conexao()
    try:
        _inicializar(conn)
        conn.execute("DELETE FROM uploads WHERE id = ? AND user_id = ?", (upload_id, user_id))
        conn.commit()
    finally:
        conn.close()


def carregar_workbook(user_id: int, upload_id: int) -> loader.WorkbookData:
    conn = _conexao()
    try:
        _inicializar(conn)
        dono = conn.execute(
            "SELECT id FROM uploads WHERE id = ? AND user_id = ?",
            (upload_id, user_id),
        ).fetchone()
        if dono is None:
            raise ValueError("Snapshot não encontrado para este usuário.")
        locais = []
        linhas = conn.execute(
            """SELECT id, nome, valor_mensal, taxa_instalacao, custo_manutencao,
                      mensal_terceirizada, chip_mensal, custos_softwares,
                      mao_de_obra, data_inst
               FROM locais WHERE upload_id = ?
               AND EXISTS (SELECT 1 FROM uploads u WHERE u.id = locais.upload_id AND u.user_id = ?)
               ORDER BY id""",
            (upload_id, user_id),
        ).fetchall()
        for linha in linhas:
            nome, valor_mensal, taxa, manutencao, terceirizada, chip, softwares, mao_obra, data_inst = linha[1:]
            local_id = int(linha[0])
            itens = [
                loader.Item(
                    cod=str(cod) if cod is not None else "",
                    material=material,
                    qtd=qtd,
                    valor_unit=valor_unit,
                    valor_total=valor_total,
                    categoria=categoria,
                )
                for categoria, cod, material, qtd, valor_unit, valor_total in conn.execute(
                    """SELECT categoria, cod, material, qtd, valor_unit, valor_total
                       FROM itens WHERE local_id = ? ORDER BY id""",
                    (local_id,),
                ).fetchall()
            ]
            locais.append(
                loader.Local(
                    nome=nome,
                    valor_mensal=valor_mensal,
                    taxa_instalacao=taxa,
                    custo_manutencao=manutencao,
                    mensal_terceirizada=terceirizada,
                    chip_mensal=chip,
                    custos_softwares=softwares,
                    mao_de_obra=mao_obra,
                    data_inst=loader._to_date(data_inst),
                    itens=itens,
                )
            )
        return loader.WorkbookData(locais=locais)
    finally:
        conn.close()
