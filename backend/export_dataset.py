"""Exportação de datasets (CSV/XLSX) sem pandas.

Aceita IDs numéricos (datasets livres) e IDs virtuais (locais-{pid}/itens-{pid}).
Usa `listar_linhas` do datasets_store para obter as linhas.
"""

import csv
import io

import openpyxl

import datasets_store


def _colunas_do_dataset(dataset: dict, linhas: list[dict]) -> list[str]:
    """Deriva as colunas do schema do dataset; fallback para as chaves das linhas."""
    schema = dataset.get("schema_json")
    if isinstance(schema, dict) and isinstance(schema.get("colunas"), list):
        colunas = []
        for c in schema["colunas"]:
            if isinstance(c, dict):
                colunas.append(c.get("campo") or c.get("nome"))
            else:
                colunas.append(str(c))
        colunas = [c for c in colunas if c]
        if colunas:
            return colunas
    if isinstance(schema, list):
        colunas = []
        for c in schema:
            if isinstance(c, dict) and c.get("campo"):
                colunas.append(c["campo"])
        if colunas:
            return colunas
    # fallback: chaves das linhas em ordem de primeira aparição
    colunas = []
    vistos = set()
    for linha in linhas:
        for chave in (linha.get("data_json") or {}):
            if chave not in vistos:
                vistos.add(chave)
                colunas.append(chave)
    return colunas


def exportar_csv(did, projeto_id, db_url=None) -> bytes:
    dataset = datasets_store.obter_dataset(did, projeto_id, db_url=db_url)
    if dataset is None:
        raise ValueError("Dataset não encontrado.")
    linhas = datasets_store.listar_linhas(did, projeto_id, db_url=db_url)
    colunas = _colunas_do_dataset(dataset, linhas)
    buffer = io.StringIO()
    escritor = csv.writer(buffer)
    escritor.writerow(colunas)
    for linha in linhas:
        dados = linha.get("data_json") or {}
        escritor.writerow([dados.get(c, "") for c in colunas])
    return buffer.getvalue().encode("utf-8")


def exportar_xlsx(did, projeto_id, db_url=None) -> bytes:
    dataset = datasets_store.obter_dataset(did, projeto_id, db_url=db_url)
    if dataset is None:
        raise ValueError("Dataset não encontrado.")
    linhas = datasets_store.listar_linhas(did, projeto_id, db_url=db_url)
    colunas = _colunas_do_dataset(dataset, linhas)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Dados"
    ws.append(colunas)
    for celula in ws[1]:
        celula.font = openpyxl.styles.Font(bold=True)
    for linha in linhas:
        dados = linha.get("data_json") or {}
        ws.append([dados.get(c, "") for c in colunas])
    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()
