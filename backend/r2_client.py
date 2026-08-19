"""Wrapper sobre Cloudflare R2 (S3-compatible via boto3).

Credenciais via env vars (NUNCA hardcoded):
- CF_ACCOUNT_ID
- CF_ACCESS_KEY_ID
- CF_ACCESS_KEY_SECRET
- CF_R2_BUCKET

A URL do R2 NUNCA é exposta ao frontend — o backend faz proxy via /download.
"""

import os


def _env(nome: str) -> str:
    valor = os.environ.get(nome)
    if not valor:
        raise RuntimeError(f"Variável de ambiente obrigatória ausente: {nome}")
    return valor


def get_s3_client():
    import boto3

    account_id = _env("CF_ACCOUNT_ID")
    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=_env("CF_ACCESS_KEY_ID"),
        aws_secret_access_key=_env("CF_ACCESS_KEY_SECRET"),
    )


def upload_pdf(key: str, content: bytes) -> str:
    """Faz upload do PDF. Retorna a key (NÃO URL pública)."""
    bucket = _env("CF_R2_BUCKET")
    get_s3_client().put_object(Bucket=bucket, Key=key, Body=content)
    return key


def download_pdf(key: str) -> bytes:
    """Baixa o PDF do R2."""
    bucket = _env("CF_R2_BUCKET")
    obj = get_s3_client().get_object(Bucket=bucket, Key=key)
    return obj["Body"].read()
