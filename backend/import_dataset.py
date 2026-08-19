"""Parsing de arquivos CSV/XLSX para datasets livres (sem pandas).

Detecta formato por content-type e/ou magic bytes, normaliza números no
formato brasileiro (1.234,56 -> 1234.56) e infere tipos das colunas.
"""

import csv
import io
from datetime import datetime

import openpyxl

LIMITE_BYTES = 10 * 1024 * 1024  # 10MB

_CONTENT_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
_CONTENT_XLS = "application/vnd.ms-excel"
_CONTENT_CSV = "text/csv"


def _eh_xlsx_bytes(dados: bytes) -> bool:
    return dados[:4] == b"PK\x03\x04"


def _eh_csv_bytes(dados: bytes) -> bool:
    return b"\x00" not in dados[:1024]


def _detectar_encoding(dados: bytes) -> str:
    try:
        dados.decode("utf-8")
        return "utf-8"
    except UnicodeDecodeError:
        return "latin-1"


def _detectar_separador(texto: str) -> str:
    for linha in texto.splitlines():
        if linha.strip():
            return ";" if linha.count(";") > linha.count(",") else ","
    return ","


def _normalizar_numero(v: str) -> str:
    """Normaliza número BR/US para notação com ponto decimal."""
    if "," in v and "." in v:
        return v.replace(".", "").replace(",", ".")
    if "," in v:
        return v.replace(",", ".")
    if "." in v:
        partes = v.split(".")
        if len(partes) > 1 and len(partes[-1]) == 3:
            return v.replace(".", "")
    return v


def _normalizar_valor(valor: str) -> str:
    v = valor.strip()
    if not v:
        return v
    t = v.replace("R$", "").replace("$", "").replace(" ", "")
    if t and all(ch.isdigit() or ch in ".,-+" for ch in t):
        return _normalizar_numero(t)
    return v


def _para_numero(valor):
    if isinstance(valor, bool):
        return None
    if isinstance(valor, (int, float)):
        return float(valor)
    try:
        return float(_normalizar_numero(str(valor).strip()))
    except (TypeError, ValueError):
        return None


def _eh_data(valor) -> bool:
    if isinstance(valor, datetime):
        return True
    if isinstance(valor, str):
        v = valor.strip()
        for fmt in ("%d/%m/%Y", "%d/%m/%y", "%Y-%m-%d", "%d-%m-%Y"):
            try:
                datetime.strptime(v, fmt)
                return True
            except ValueError:
                continue
    return False


def _inferir_tipo(coluna: str, linhas: list[dict], amostra: int) -> str:
    valores = []
    for linha in linhas[:amostra]:
        v = linha.get(coluna)
        if v is not None and str(v).strip() != "":
            valores.append(v)
    if not valores:
        return "text"
    datas = sum(1 for v in valores if _eh_data(v))
    numeros = sum(1 for v in valores if _para_numero(v) is not None)
    if datas >= len(valores) * 0.8:
        return "date"
    if numeros >= len(valores) * 0.8:
        return "number"
    return "text"


def inferir_tipos(colunas: list[str], linhas: list[dict], amostra: int = 50) -> dict[str, str]:
    """Retorna mapa {coluna: "text"|"number"|"date"} baseado nas primeiras linhas."""
    return {coluna: _inferir_tipo(coluna, linhas, amostra) for coluna in colunas}


def _parse_csv(dados: bytes) -> tuple[list[str], list[dict]]:
    encoding = _detectar_encoding(dados)
    texto = dados.decode(encoding)
    separador = _detectar_separador(texto)
    leitor = csv.DictReader(io.StringIO(texto), delimiter=separador)
    colunas = [c.strip() for c in (leitor.fieldnames or []) if c and c.strip()]
    linhas = []
    for registro in leitor:
        if not any((v or "").strip() for v in registro.values()):
            continue  # linha vazia
        linha = {}
        for coluna in colunas:
            linha[coluna] = _normalizar_valor(registro.get(coluna) or "")
        linhas.append(linha)
    return colunas, linhas


def _parse_xlsx(dados: bytes) -> tuple[list[str], list[dict]]:
    try:
        wb = openpyxl.load_workbook(io.BytesIO(dados), read_only=True, data_only=True)
    except Exception as erro:
        raise ValueError(f"Arquivo XLSX inválido: {erro}")
    try:
        ws = wb.active
        iterador = ws.iter_rows(values_only=True)
        try:
            cabecalho = next(iterador)
        except StopIteration:
            return [], []
        colunas = []
        indices = []
        for idx, c in enumerate(cabecalho):
            nome = str(c).strip() if c is not None else ""
            if nome:
                colunas.append(nome)
                indices.append(idx)
        linhas = []
        for valores in iterador:
            if valores is None or not any(v is not None and str(v).strip() for v in valores):
                continue  # linha vazia
            linha = {}
            for j, idx in enumerate(indices):
                v = valores[idx] if idx < len(valores) else None
                if isinstance(v, datetime):
                    v = v.strftime("%d/%m/%Y")
                elif v is not None:
                    v = str(v).strip()
                else:
                    v = ""
                linha[colunas[j]] = v
            linhas.append(linha)
        return colunas, linhas
    finally:
        wb.close()


def parse_arquivo(arquivo_bytes: bytes, content_type: str) -> tuple[list[str], list[dict]]:
    """Detecta o formato e retorna (colunas, linhas). Linhas vazias são puladas."""
    ct = (content_type or "").lower()
    if _eh_xlsx_bytes(arquivo_bytes) or ct in (_CONTENT_XLSX, _CONTENT_XLS):
        return _parse_xlsx(arquivo_bytes)
    if ct in (_CONTENT_CSV, "application/csv") or _eh_csv_bytes(arquivo_bytes):
        return _parse_csv(arquivo_bytes)
    raise ValueError("Formato de arquivo não suportado. Use CSV ou XLSX.")
