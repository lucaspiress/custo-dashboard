from fastapi import APIRouter, Depends, HTTPException

import agendamentos_store
import publicacoes_store
from deps import usuario_atual

router = APIRouter(prefix="/api", tags=["agendamentos"])


@router.post("/agendamentos")
def criar(dados: dict, usuario: dict = Depends(usuario_atual)) -> dict:
    publicacao_id = dados.get("publicacao_id")
    periodicidade = dados.get("periodicidade")
    if not publicacao_id:
        raise HTTPException(status_code=400, detail="Informe publicacao_id.")
    publicacao = publicacoes_store.obter(int(publicacao_id))
    if publicacao is None:
        raise HTTPException(status_code=404, detail="Publicação não encontrada.")
    try:
        return agendamentos_store.criar(int(publicacao_id), periodicidade, usuario["id"])
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))


@router.get("/agendamentos")
def listar(usuario: dict = Depends(usuario_atual)) -> list[dict]:
    return agendamentos_store.listar(criado_por=usuario["id"])


@router.patch("/agendamentos/{aid}")
def atualizar(aid: int, dados: dict, usuario: dict = Depends(usuario_atual)) -> dict:
    agendamento = agendamentos_store.obter(aid)
    if agendamento is None or int(agendamento["criado_por"]) != usuario["id"]:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    try:
        atualizado = agendamentos_store.atualizar(
            aid,
            periodicidade=dados.get("periodicidade"),
            ativo=dados.get("ativo"),
        )
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))
    return atualizado or {}


@router.delete("/agendamentos/{aid}", status_code=204)
def excluir(aid: int, usuario: dict = Depends(usuario_atual)) -> None:
    agendamento = agendamentos_store.obter(aid)
    if agendamento is None or int(agendamento["criado_por"]) != usuario["id"]:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    agendamentos_store.deletar(aid)
