"""Acesso a dados de projetos, locais e itens (Neon via psycopg ou SQLite local).

Segue o mesmo padrão de db.py/history.py: a ramificação é feita por database_url().
As tabelas são criadas no boot (schema.sql no Neon, history._inicializar no SQLite).
"""

from datetime import datetime

import db
import history

COLS_LOCAL = (
    "nome, valor_mensal, taxa_instalacao, custo_manutencao, mensal_terceirizada, "
    "chip_mensal, custos_softwares, mao_de_obra, data_inst"
)
COLS_ITEM = "local_id, categoria, cod, material, qtd, valor_unit, valor_total"


def _sqlite() -> bool:
    return not db.enabled()


def _conn():
    if _sqlite():
        return history._conexao()
    return db.connect()


def _isolar_valor(valor) -> float:
    try:
        return float(valor or 0)
    except (TypeError, ValueError):
        return 0.0


# ---------------------------------------------------------------- projetos

def listar_projetos(cliente_usuario_id: int | None = None) -> list[dict]:
    conn = _conn()
    try:
        if _sqlite():
            if cliente_usuario_id is None:
                linhas = conn.execute(
                    """select id, nome, cliente, cliente_usuario_id, criado_em
                       from projetos order by criado_em desc, id desc"""
                ).fetchall()
            else:
                linhas = conn.execute(
                    """select id, nome, cliente, cliente_usuario_id, criado_em
                       from projetos where cliente_usuario_id = ?
                       order by criado_em desc, id desc""",
                    (cliente_usuario_id,),
                ).fetchall()
            return [dict(linha) for linha in linhas]
        if cliente_usuario_id is None:
            return list(
                conn.execute(
                    """select id, nome, cliente, cliente_usuario_id, criado_em
                       from public.projetos order by criado_em desc, id desc"""
                ).fetchall()
            )
        return list(
            conn.execute(
                """select id, nome, cliente, cliente_usuario_id, criado_em
                   from public.projetos where cliente_usuario_id = %s
                   order by criado_em desc, id desc""",
                (cliente_usuario_id,),
            ).fetchall()
        )
    finally:
        conn.close()


def criar_projeto(nome: str, cliente: str | None = None, cliente_usuario_id: int | None = None) -> dict:
    conn = _conn()
    try:
        nome = nome.strip()
        cliente_norm = (cliente or "").strip() or None
        if _sqlite():
            cursor = conn.execute(
                "insert into projetos (nome, cliente, cliente_usuario_id, criado_em) values (?, ?, ?, ?)",
                (nome, cliente_norm, cliente_usuario_id, datetime.now().isoformat(timespec="seconds")),
            )
            conn.commit()
            return {
                "id": int(cursor.lastrowid),
                "nome": nome,
                "cliente": cliente_norm,
                "cliente_usuario_id": cliente_usuario_id,
            }
        linha = conn.execute(
            """insert into public.projetos (nome, cliente, cliente_usuario_id)
               values (%s, %s, %s)
               returning id, nome, cliente, cliente_usuario_id, criado_em""",
            (nome, cliente_norm, cliente_usuario_id),
        ).fetchone()
        conn.commit()
        return dict(linha)
    finally:
        conn.close()


def get_projeto(projeto_id: int) -> dict | None:
    conn = _conn()
    try:
        if _sqlite():
            linha = conn.execute(
                "select id, nome, cliente, cliente_usuario_id, criado_em from projetos where id = ?",
                (projeto_id,),
            ).fetchone()
            return dict(linha) if linha else None
        return conn.execute(
            """select id, nome, cliente, cliente_usuario_id, criado_em
               from public.projetos where id = %s""",
            (projeto_id,),
        ).fetchone()
    finally:
        conn.close()


_SEM_ALTERAR = object()


def renomear_projeto(
    projeto_id: int,
    nome: str | None = None,
    cliente: str | None = None,
    cliente_usuario_id: int | None | object = _SEM_ALTERAR,
) -> dict | None:
    conn = _conn()
    try:
        atual = get_projeto(projeto_id)
        if atual is None:
            return None
        novo_nome = nome.strip() if nome is not None and nome.strip() else atual["nome"]
        if cliente is not None:
            novo_cliente = cliente.strip() or None
        else:
            novo_cliente = atual.get("cliente")
        if cliente_usuario_id is _SEM_ALTERAR:
            novo_cliente_uid = atual.get("cliente_usuario_id")
        else:
            novo_cliente_uid = int(cliente_usuario_id) if cliente_usuario_id is not None else None
        if _sqlite():
            conn.execute(
                "update projetos set nome = ?, cliente = ?, cliente_usuario_id = ? where id = ?",
                (novo_nome, novo_cliente, novo_cliente_uid, projeto_id),
            )
            conn.commit()
        else:
            conn.execute(
                "update public.projetos set nome = %s, cliente = %s, cliente_usuario_id = %s where id = %s",
                (novo_nome, novo_cliente, novo_cliente_uid, projeto_id),
            )
            conn.commit()
        return get_projeto(projeto_id)
    finally:
        conn.close()


def excluir_projeto(projeto_id: int) -> bool:
    conn = _conn()
    try:
        if _sqlite():
            cursor = conn.execute("delete from projetos where id = ?", (projeto_id,))
        else:
            cursor = conn.execute("delete from public.projetos where id = %s", (projeto_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


# ------------------------------------------------------------------ locais

def listar_locais(projeto_id: int) -> list[dict]:
    conn = _conn()
    try:
        if _sqlite():
            linhas = conn.execute(
                "select id, projeto_id, " + COLS_LOCAL + " from locais where projeto_id = ? order by id",
                (projeto_id,),
            ).fetchall()
            return [dict(linha) for linha in linhas]
        return list(
            conn.execute(
                """select id, projeto_id, """ + COLS_LOCAL
                + """ from public.locais where projeto_id = %s order by id""",
                (projeto_id,),
            ).fetchall()
        )
    finally:
        conn.close()


def criar_local(projeto_id: int, dados: dict) -> dict:
    conn = _conn()
    try:
        if _sqlite():
            cursor = conn.execute(
                "insert into locais (projeto_id, " + COLS_LOCAL + ") values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    projeto_id,
                    dados["nome"].strip(),
                    _isolar_valor(dados.get("valor_mensal")),
                    _isolar_valor(dados.get("taxa_instalacao")),
                    _isolar_valor(dados.get("custo_manutencao")),
                    _isolar_valor(dados.get("mensal_terceirizada")),
                    _isolar_valor(dados.get("chip_mensal")),
                    _isolar_valor(dados.get("custos_softwares")),
                    _isolar_valor(dados.get("mao_de_obra")),
                    dados.get("data_inst"),
                ),
            )
            conn.commit()
            return get_local(int(cursor.lastrowid))  # type: ignore[return-value]
        linha = conn.execute(
            """insert into public.locais (projeto_id, """ + COLS_LOCAL + """)
               values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
               returning id, projeto_id, """ + COLS_LOCAL,
            (
                projeto_id,
                dados["nome"].strip(),
                _isolar_valor(dados.get("valor_mensal")),
                _isolar_valor(dados.get("taxa_instalacao")),
                _isolar_valor(dados.get("custo_manutencao")),
                _isolar_valor(dados.get("mensal_terceirizada")),
                _isolar_valor(dados.get("chip_mensal")),
                _isolar_valor(dados.get("custos_softwares")),
                _isolar_valor(dados.get("mao_de_obra")),
                dados.get("data_inst"),
            ),
        ).fetchone()
        conn.commit()
        return dict(linha)
    finally:
        conn.close()


def get_local(local_id: int) -> dict | None:
    conn = _conn()
    try:
        if _sqlite():
            linha = conn.execute(
                "select id, projeto_id, " + COLS_LOCAL + " from locais where id = ?",
                (local_id,),
            ).fetchone()
            return dict(linha) if linha else None
        return conn.execute(
            """select id, projeto_id, """ + COLS_LOCAL + """ from public.locais where id = %s""",
            (local_id,),
        ).fetchone()
    finally:
        conn.close()


def _get_local_conn(conn, local_id: int) -> dict | None:
    if _sqlite():
        linha = conn.execute(
            "select id, projeto_id, " + COLS_LOCAL + " from locais where id = ?",
            (local_id,),
        ).fetchone()
        return dict(linha) if linha else None
    return conn.execute(
        """select id, projeto_id, """ + COLS_LOCAL + " from public.locais where id = %s""",
        (local_id,),
    ).fetchone()


def atualizar_local(local_id: int, dados: dict) -> dict | None:
    conn = _conn()
    try:
        if _get_local_conn(conn, local_id) is None:
            return None

        campos_numericos = (
            "valor_mensal", "taxa_instalacao", "custo_manutencao",
            "mensal_terceirizada", "chip_mensal", "custos_softwares", "mao_de_obra",
        )
        sets = []
        parametros = []
        for campo in ("nome", *campos_numericos, "data_inst"):
            if campo not in dados:
                continue
            valor = dados[campo]
            if campo == "nome":
                valor = valor.strip() if isinstance(valor, str) else ""
                if not valor:
                    continue
            elif campo in campos_numericos:
                valor = _isolar_valor(valor)
            sets.append(campo + (" = ?" if _sqlite() else " = %s"))
            parametros.append(valor)

        if not sets:
            return _get_local_conn(conn, local_id)

        parametros.append(local_id)
        if _sqlite():
            conn.execute(
                "update locais set " + ", ".join(sets) + " where id = ?",
                parametros,
            )
            conn.commit()
        else:
            conn.execute(
                "update public.locais set " + ", ".join(sets) + " where id = %s",
                parametros,
            )
            conn.commit()
        return _get_local_conn(conn, local_id)
    finally:
        conn.close()


def excluir_local(local_id: int) -> bool:
    conn = _conn()
    try:
        if _sqlite():
            cursor = conn.execute("delete from locais where id = ?", (local_id,))
        else:
            cursor = conn.execute("delete from public.locais where id = %s", (local_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


# ------------------------------------------------------------------- itens

def listar_itens(local_id: int) -> list[dict]:
    conn = _conn()
    try:
        if _sqlite():
            linhas = conn.execute(
                "select id, local_id, " + COLS_ITEM + " from itens where local_id = ? order by id",
                (local_id,),
            ).fetchall()
            return [dict(linha) for linha in linhas]
        return list(
            conn.execute(
                """select id, local_id, """ + COLS_ITEM + """ from public.itens
                   where local_id = %s order by id""",
                (local_id,),
            ).fetchall()
        )
    finally:
        conn.close()


def criar_item(local_id: int, dados: dict) -> dict:
    conn = _conn()
    try:
        qtd = _isolar_valor(dados.get("qtd"))
        valor_unit = _isolar_valor(dados.get("valor_unit"))
        valor_total = dados.get("valor_total")
        if valor_total is None:
            valor_total = qtd * valor_unit
        else:
            valor_total = _isolar_valor(valor_total)
        if _sqlite():
            cursor = conn.execute(
                "insert into itens (" + COLS_ITEM + ") values (?, ?, ?, ?, ?, ?, ?)",
                (local_id, dados.get("categoria", "").strip(), (dados.get("cod") or "").strip(),
                 dados.get("material", "").strip(), qtd, valor_unit, valor_total),
            )
            conn.commit()
            return get_item(int(cursor.lastrowid))  # type: ignore[return-value]
        linha = conn.execute(
            """insert into public.itens (""" + COLS_ITEM + """)
               values (%s, %s, %s, %s, %s, %s, %s)
               returning id, local_id, """ + COLS_ITEM,
            (local_id, dados.get("categoria", "").strip(), (dados.get("cod") or "").strip(),
             dados.get("material", "").strip(), qtd, valor_unit, valor_total),
        ).fetchone()
        conn.commit()
        return dict(linha)
    finally:
        conn.close()


def get_item(item_id: int) -> dict | None:
    conn = _conn()
    try:
        if _sqlite():
            linha = conn.execute(
                "select id, local_id, " + COLS_ITEM + " from itens where id = ?",
                (item_id,),
            ).fetchone()
            return dict(linha) if linha else None
        return conn.execute(
            """select id, local_id, """ + COLS_ITEM + """ from public.itens where id = %s""",
            (item_id,),
        ).fetchone()
    finally:
        conn.close()


def _get_item_conn(conn, item_id: int) -> dict | None:
    if _sqlite():
        linha = conn.execute(
            "select id, local_id, " + COLS_ITEM + " from itens where id = ?",
            (item_id,),
        ).fetchone()
        return dict(linha) if linha else None
    return conn.execute(
        """select id, local_id, """ + COLS_ITEM + " from public.itens where id = %s""",
        (item_id,),
    ).fetchone()


def atualizar_item(item_id: int, dados: dict) -> dict | None:
    conn = _conn()
    try:
        if _get_item_conn(conn, item_id) is None:
            return None

        sets = []
        parametros = []
        valores_numericos = {}
        for campo in ("categoria", "cod", "material"):
            if campo not in dados:
                continue
            valor = dados[campo]
            valor = valor.strip() if isinstance(valor, str) else ""
            sets.append(campo + (" = ?" if _sqlite() else " = %s"))
            parametros.append(valor)
        for campo in ("qtd", "valor_unit"):
            if campo not in dados:
                continue
            valor = _isolar_valor(dados[campo])
            sets.append(campo + (" = ?" if _sqlite() else " = %s"))
            parametros.append(valor)
            valores_numericos[campo] = valor

        # Recalcular com o valor enviado para cada campo alterado e com o valor
        # persistido para o outro campo. Assim, patches concorrentes de qtd e
        # valor_unit compõem o resultado atual, em vez de regravar um snapshot
        # lido anteriormente. O total também é mantido derivado para patches
        # de texto, como acontecia antes desta atualização.
        if sets:
            placeholder = "?" if _sqlite() else "%s"
            qtd_expr = placeholder if "qtd" in valores_numericos else "qtd"
            unit_expr = placeholder if "valor_unit" in valores_numericos else "valor_unit"
            sets.append("valor_total = " + qtd_expr + " * " + unit_expr)
            if "qtd" in valores_numericos:
                parametros.append(valores_numericos["qtd"])
            if "valor_unit" in valores_numericos:
                parametros.append(valores_numericos["valor_unit"])

        if not sets:
            return _get_item_conn(conn, item_id)

        parametros.append(item_id)
        if _sqlite():
            conn.execute(
                "update itens set " + ", ".join(sets) + " where id = ?",
                parametros,
            )
            conn.commit()
        else:
            conn.execute(
                "update public.itens set " + ", ".join(sets) + " where id = %s",
                parametros,
            )
            conn.commit()
        return _get_item_conn(conn, item_id)
    finally:
        conn.close()


def excluir_item(item_id: int) -> bool:
    conn = _conn()
    try:
        if _sqlite():
            cursor = conn.execute("delete from itens where id = ?", (item_id,))
        else:
            cursor = conn.execute("delete from public.itens where id = %s", (item_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()
