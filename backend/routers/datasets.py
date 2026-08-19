from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response

import datasets_store
import export_dataset
import import_dataset
from deps import exigir_projeto, usuario_atual

router = APIRouter(prefix="/api", tags=["datasets"])


def _rejeitar_virtual(did: str) -> None:
    if datasets_store.eh_virtual(did):
        raise HTTPException(status_code=405, detail="Operação não permitida em dataset virtual.")


@router.get("/projetos/{projeto_id}/datasets")
def listar(projeto_id: int, usuario: dict = Depends(usuario_atual)) -> list[dict]:
    exigir_projeto(usuario, projeto_id)
    return datasets_store.listar_datasets(projeto_id)


@router.post("/projetos/{projeto_id}/datasets")
def criar(projeto_id: int, dados: dict, usuario: dict = Depends(usuario_atual)) -> dict:
    exigir_projeto(usuario, projeto_id)
    nome = str(dados.get("nome") or "").strip()
    if not nome:
        raise HTTPException(status_code=400, detail="Informe o nome do dataset.")
    schema_json = dados.get("schema_json") or {}
    if not isinstance(schema_json, dict):
        raise HTTPException(status_code=400, detail="schema_json deve ser um objeto.")
    try:
        return datasets_store.criar_dataset(projeto_id, nome, schema_json)
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))


@router.get("/projetos/{projeto_id}/datasets/{did}")
def obter(projeto_id: int, did: str, usuario: dict = Depends(usuario_atual)) -> dict:
    exigir_projeto(usuario, projeto_id)
    dataset = datasets_store.obter_dataset(did, projeto_id)
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset não encontrado.")
    return dataset


@router.patch("/projetos/{projeto_id}/datasets/{did}")
def atualizar(projeto_id: int, did: str, dados: dict, usuario: dict = Depends(usuario_atual)) -> dict:
    exigir_projeto(usuario, projeto_id)
    _rejeitar_virtual(did)
    try:
        atualizado = datasets_store.atualizar_dataset(
            did,
            projeto_id,
            nome=dados.get("nome"),
            schema_json=dados.get("schema_json"),
        )
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))
    if atualizado is None:
        raise HTTPException(status_code=404, detail="Dataset não encontrado.")
    return atualizado


@router.delete("/projetos/{projeto_id}/datasets/{did}", status_code=204)
def excluir(projeto_id: int, did: str, usuario: dict = Depends(usuario_atual)) -> None:
    exigir_projeto(usuario, projeto_id)
    _rejeitar_virtual(did)
    try:
        removido = datasets_store.deletar_dataset(did, projeto_id)
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))
    if not removido:
        raise HTTPException(status_code=404, detail="Dataset não encontrado.")


def _dataset_linhas_ou_404(did: str, usuario: dict) -> tuple[str, int]:
    """Resolve `did` (virtual ou numérico) para (did, projeto_id) validando acesso."""
    virtual = datasets_store.id_virtual(did)
    if virtual:
        fonte, pid = virtual
        exigir_projeto(usuario, pid)
        return did, pid
    dataset = datasets_store.obter_dataset_por_id(did)
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset não encontrado.")
    projeto_id = int(dataset["projeto_id"])
    exigir_projeto(usuario, projeto_id)
    return did, projeto_id


@router.get("/datasets/{did}/rows")
def listar_linhas(did: str, usuario: dict = Depends(usuario_atual)) -> list[dict]:
    did_resolvido, projeto_id = _dataset_linhas_ou_404(did, usuario)
    return datasets_store.listar_linhas(did_resolvido, projeto_id)


@router.post("/datasets/{did}/rows")
def adicionar_linhas(did: str, dados: dict, usuario: dict = Depends(usuario_atual)) -> dict:
    did_resolvido, projeto_id = _dataset_linhas_ou_404(did, usuario)
    _rejeitar_virtual(did_resolvido)
    rows = dados.get("rows")
    if not isinstance(rows, list):
        raise HTTPException(status_code=400, detail="Informe a lista de linhas em 'rows'.")
    try:
        total = datasets_store.adicionar_linhas(did_resolvido, projeto_id, rows)
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))
    return {"adicionadas": total}


@router.post("/datasets/{did}/importar")
async def importar(did: str, arquivo: UploadFile = File(...), usuario: dict = Depends(usuario_atual)) -> dict:
    did_resolvido, projeto_id = _dataset_linhas_ou_404(did, usuario)
    _rejeitar_virtual(did_resolvido)
    content = await arquivo.read()
    if len(content) > import_dataset.LIMITE_BYTES:
        raise HTTPException(status_code=413, detail="Arquivo excede o limite de 10MB.")
    try:
        colunas, linhas = import_dataset.parse_arquivo(content, arquivo.content_type or "")
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))
    if not colunas:
        raise HTTPException(status_code=400, detail="Arquivo sem colunas/linhas válidas.")
    tipos = import_dataset.inferir_tipos(colunas, linhas)
    try:
        datasets_store.atualizar_dataset(
            did_resolvido,
            projeto_id,
            schema_json={"colunas": colunas, "tipos": tipos},
        )
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))
    rows = [{"row_index": idx, "data_json": linha} for idx, linha in enumerate(linhas)]
    try:
        total = datasets_store.adicionar_linhas(did_resolvido, projeto_id, rows)
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))
    return {"colunas": colunas, "linhas_adicionadas": total, "tipos": tipos}


@router.get("/datasets/{did}/export.csv")
def exportar_csv(did: str, usuario: dict = Depends(usuario_atual)) -> Response:
    did_resolvido, projeto_id = _dataset_linhas_ou_404(did, usuario)
    try:
        conteudo = export_dataset.exportar_csv(did_resolvido, projeto_id)
    except ValueError as erro:
        raise HTTPException(status_code=404, detail=str(erro))
    return Response(
        content=conteudo,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=dataset_{did_resolvido}.csv"},
    )


@router.get("/datasets/{did}/export.xlsx")
def exportar_xlsx(did: str, usuario: dict = Depends(usuario_atual)) -> Response:
    did_resolvido, projeto_id = _dataset_linhas_ou_404(did, usuario)
    try:
        conteudo = export_dataset.exportar_xlsx(did_resolvido, projeto_id)
    except ValueError as erro:
        raise HTTPException(status_code=404, detail=str(erro))
    return Response(
        content=conteudo,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=dataset_{did_resolvido}.xlsx"},
    )
