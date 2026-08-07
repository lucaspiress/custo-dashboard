import argparse
import getpass

import auth
import config
import db


def main() -> None:
    parser = argparse.ArgumentParser(description="Cria o primeiro administrador do Custo Dashboard.")
    parser.add_argument("--username", default="lucaspires")
    parser.add_argument("--nome", default="Lucas Pires")
    args = parser.parse_args()

    if not db.enabled():
        raise SystemExit("Defina DATABASE_URL no ambiente antes de executar este script.")
    db.ensure_schema()
    if db.count_admins() >= config.MAX_ADMINS:
        raise SystemExit(f"O limite de {config.MAX_ADMINS} administradores já foi atingido.")
    if db.get_user_by_username(args.username):
        raise SystemExit(f"O usuário '{args.username}' já existe.")

    password = getpass.getpass("Senha do administrador: ")
    confirmation = getpass.getpass("Confirme a senha: ")
    if not password or password != confirmation:
        raise SystemExit("As senhas não coincidem ou estão vazias.")
    senha_hash, salt = auth.password_hash(password)
    user_id = db.create_user(args.username, args.nome, senha_hash, salt, "admin")
    print(f"Administrador criado com id={user_id}.")


if __name__ == "__main__":
    main()
