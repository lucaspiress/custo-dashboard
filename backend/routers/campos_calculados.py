from fastapi import APIRouter, Depends, HTTPException

import campos_calculados_store
import datasets_store
import formula_parser
from deps import exigir_projeto, usuario_atual

router = APIRouter(prefix="/api", tags=["campos-calculados"])


def _dataset_ou_404(did: str, usuario: dict) -> tuple[str, int]:
    """Resolve did (numérico) para (did, projeto_id) validando acesso. Virtual -> 405."""
    if datasets_store.eh_virtual(did):
        raise HTTPException(status_code=405, detail="Campos calculados só em datasets livres.")
    dataset = datasets_store.obter_dataset_por_id(did)
    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset não encontrado.")
    projeto_id = int(dataset["projeto_id"])
    exigir_projeto(usuario, projeto_id)
    return did, projeto_id


def _erro_formula(erro: formula_parser.FormulaError) -> HTTPException:
    return HTTPException(status_code=400, detail={"erro": f"Fórmula inválida: {erro}"})


@router.get("/datasets/{did}/campos-calculados")
def listar(did: str, usuario: dict = Depends(usuario_atual)) -> list[dict]:
    did_resolvido, _ = _dataset_ou_404(did, usuario)
    try:
        return campos_calculados_store.listar(did_resolvido)
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))


@router.post("/datasets/{did}/campos-calculados")
def criar(did: str, dados: dict, usuario: dict = Depends(usuario_atual)) -> dict:
    did_resolvido, projeto_id = _dataset_ou_404(did, usuario)
    try:
        return campos_calculados_store.criar(
            did_resolvido,
            projeto_id,
            dados.get("nome"),
            dados.get("formula"),
            ordem=dados.get("ordem", 0),
        )
    except formula_parser.FormulaError as erro:
        raise _erro_formula(erro)
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))


@router.patch("/datasets/{did}/campos-calculados/{cid}")
def atualizar(did: str, cid: int, dados: dict, usuario: dict = Depends(usuario_atual)) -> dict:
    did_resolvido, _ = _dataset_ou_404(did, usuario)
    campo = campos_calculados_store.obter(cid)
    if campo is None or int(campo["dataset_id"]) != int(did_resolvido):
        raise HTTPException(status_code=404, detail="Campo calculado não encontrado.")
    try:
        atualizado = campos_calculados_store.atualizar(
            cid,
            nome=dados.get("nome"),
            formula=dados.get("formula"),
            ordem=dados.get("ordem"),
        )
    except formula_parser.FormulaError as erro:
        raise _erro_formula(erro)
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))
    return atualizado or {}


@router.delete("/datasets/{did}/campos-calculados/{cid}", status_code=204)
def excluir(did: str, cid: int, usuario: dict = Depends(usuario_atual)) -> None:
    did_resolvido, _ = _dataset_ou_404(did, usuario)
    campo = campos_calculados_store.obter(cid)
    if campo is None or int(campo["dataset_id"]) != int(did_resolvido):
        raise HTTPException(status_code=404, detail="Campo calculado não encontrado.")
    campos_calculados_store.deletar(cid)
