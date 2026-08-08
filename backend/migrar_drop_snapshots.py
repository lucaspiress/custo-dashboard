"""One-off: remove as tabelas de snapshot (uploads/locais/itens) do Neon.

O banco passa a ser usado apenas para usuários. Rode uma única vez
após o deploy: python migrar_drop_snapshots.py
"""

import db


def main() -> None:
    if not db.enabled():
        print("DATABASE_URL não definida — nada a fazer.")
        return
    with db.connect() as conn:
        conn.execute("DROP TABLE IF EXISTS public.itens CASCADE")
        conn.execute("DROP TABLE IF EXISTS public.locais CASCADE")
        conn.execute("DROP TABLE IF EXISTS public.uploads CASCADE")
        print("Tabelas legadas (itens/locais/uploads) removidas do Neon.")


if __name__ == "__main__":
    main()
