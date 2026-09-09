"""Camada de Repositórios — Custo Dashboard

Abstrai o acesso a dados para SQLite (Dev / Offline) e Neon PostgreSQL (Produção),
oferecendo métodos fortemente tipados para manipular projetos, locais, itens e cenários.
"""

from typing import Any
import db
import history


class BaseRepository:
    @staticmethod
    def is_sqlite() -> bool:
        return not db.enabled()

    @classmethod
    def get_connection(cls):
        if cls.is_sqlite():
            return history._conexao()
        return db.connect()

    @classmethod
    def placeholder(cls) -> str:
        return "?" if cls.is_sqlite() else "%s"


class ProjectRepository(BaseRepository):
    @classmethod
    def listar(cls, cliente_usuario_id: int | None = None) -> list[dict[str, Any]]:
        conn = cls.get_connection()
        try:
            ph = cls.placeholder()
            if cls.is_sqlite():
                if cliente_usuario_id is None:
                    rows = conn.execute(
                        "select id, nome, cliente, cliente_usuario_id, criado_em from projetos order by criado_em desc, id desc"
                    ).fetchall()
                else:
                    rows = conn.execute(
                        f"select id, nome, cliente, cliente_usuario_id, criado_em from projetos where cliente_usuario_id = {ph} order by criado_em desc, id desc",
                        (cliente_usuario_id,),
                    ).fetchall()
                return [dict(r) for r in rows]
            else:
                if cliente_usuario_id is None:
                    rows = conn.execute(
                        "select id, nome, cliente, cliente_usuario_id, criado_em from public.projetos order by criado_em desc, id desc"
                    ).fetchall()
                else:
                    rows = conn.execute(
                        f"select id, nome, cliente, cliente_usuario_id, criado_em from public.projetos where cliente_usuario_id = {ph} order by criado_em desc, id desc",
                        (cliente_usuario_id,),
                    ).fetchall()
                return [dict(r) for r in rows]
        finally:
            conn.close()

    @classmethod
    def buscar_por_id(cls, projeto_id: int) -> dict[str, Any] | None:
        conn = cls.get_connection()
        try:
            ph = cls.placeholder()
            table = "projetos" if cls.is_sqlite() else "public.projetos"
            row = conn.execute(
                f"select id, nome, cliente, cliente_usuario_id, criado_em from {table} where id = {ph}",
                (projeto_id,),
            ).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()


class ScenarioRepository(BaseRepository):
    @classmethod
    def listar_por_projeto(cls, projeto_id: int) -> list[dict[str, Any]]:
        conn = cls.get_connection()
        try:
            ph = cls.placeholder()
            table = "cenarios" if cls.is_sqlite() else "public.cenarios"
            rows = conn.execute(
                f"select id, projeto_id, nome, variacao_mensal, variacao_instalacao, criado_em from {table} where projeto_id = {ph} order by id asc",
                (projeto_id,),
            ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    @classmethod
    def criar(cls, projeto_id: int, nome: str, variacao_mensal: float, variacao_instalacao: float) -> dict[str, Any]:
        conn = cls.get_connection()
        try:
            ph = cls.placeholder()
            table = "cenarios" if cls.is_sqlite() else "public.cenarios"
            cur = conn.execute(
                f"insert into {table} (projeto_id, nome, variacao_mensal, variacao_instalacao) values ({ph}, {ph}, {ph}, {ph}) returning id",
                (projeto_id, nome, variacao_mensal, variacao_instalacao),
            )
            c_id = cur.fetchone()["id"]
            conn.commit()
            return {
                "id": c_id,
                "projeto_id": projeto_id,
                "nome": nome,
                "variacao_mensal": variacao_mensal,
                "variacao_instalacao": variacao_instalacao,
            }
        finally:
            conn.close()

    @classmethod
    def excluir(cls, cenario_id: int) -> bool:
        conn = cls.get_connection()
        try:
            ph = cls.placeholder()
            table = "cenarios" if cls.is_sqlite() else "public.cenarios"
            cur = conn.execute(f"delete from {table} where id = {ph}", (cenario_id,))
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()
