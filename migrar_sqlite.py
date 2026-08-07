import argparse
from pathlib import Path

import db
import history
import loader


def main() -> None:
    parser = argparse.ArgumentParser(description="Importa planilhas existentes para o Postgres do usuário.")
    parser.add_argument("--user-id", type=int, required=True)
    parser.add_argument("files", nargs="+", help="Arquivos .xlsx que devem entrar no histórico web")
    args = parser.parse_args()
    if not db.enabled():
        raise SystemExit("Defina DATABASE_URL antes de migrar.")
    db.ensure_schema()
    for raw_path in args.files:
        path = Path(raw_path)
        data = path.read_bytes()
        workbook = loader.carregar(data)
        upload_id = db.save_snapshot(
            args.user_id,
            history.sha256_de_bytes(data),
            path.name,
            data,
            workbook.locais,
        )
        print(f"Importado: {path.name} -> upload_id={upload_id}")


if __name__ == "__main__":
    main()
