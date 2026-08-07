import db
import history

MODO = "postgres" if db.enabled() else "sqlite"


def modo_atual() -> str:
    return MODO


def ensure_schema() -> None:
    if MODO == "postgres":
        db.ensure_schema()
    else:
        history.seed_admin_local()


def get_user_by_username(username: str) -> dict | None:
    return db.get_user_by_username(username) if MODO == "postgres" else history.get_user_by_username(username)


def get_user(user_id: int) -> dict | None:
    return db.get_user(user_id) if MODO == "postgres" else history.get_user(user_id)


def count_admins() -> int:
    return db.count_admins() if MODO == "postgres" else history.count_admins()


def list_users() -> list[dict]:
    return db.list_users() if MODO == "postgres" else history.list_users()


def create_user(username: str, nome: str, senha_hash: str, salt: str, papel: str) -> int:
    if MODO == "postgres":
        return db.create_user(username, nome, senha_hash, salt, papel)
    return history.create_user(username, nome, senha_hash, salt, papel)


def set_user_active(user_id: int, ativo: bool) -> None:
    if MODO == "postgres":
        db.set_user_active(user_id, ativo)
    else:
        history.set_user_active(user_id, ativo)


def reset_password(user_id: int, senha_hash: str, salt: str) -> None:
    if MODO == "postgres":
        db.reset_password(user_id, senha_hash, salt)
    else:
        history.reset_password(user_id, senha_hash, salt)


def save_snapshot(user_id: int, sha256: str, filename: str, file_bytes: bytes, locais) -> int:
    if MODO == "postgres":
        return db.save_snapshot(user_id, sha256, filename, file_bytes, locais)
    return history.salvar_snapshot(user_id, sha256, filename, locais)


def list_uploads(user_id: int):
    return db.list_uploads(user_id) if MODO == "postgres" else history.listar_uploads(user_id)


def load_workbook(user_id: int, upload_id: int):
    return db.load_workbook(user_id, upload_id) if MODO == "postgres" else history.carregar_workbook(user_id, upload_id)


def history_locais(user_id: int):
    return db.history_locais(user_id) if MODO == "postgres" else history.carregar_historico_locais(user_id)


def delete_upload(user_id: int, upload_id: int) -> None:
    if MODO == "postgres":
        db.delete_upload(user_id, upload_id)
    else:
        history.excluir_upload(user_id, upload_id)
