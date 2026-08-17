import re
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response

import analysis
import charts
import insights
import loader
import planilha_export
import projetos_store
import report
import serialize
from deps import admin_obrigatorio, exigir_projeto, usuario_atual

router = APIRouter(prefix="/projetos", tags=["projetos"])

HORIZONTES_FLUXO = (6, 12, 24, 36)

CAMPOS_LOCAL = ("nome", "valor_mensal", "taxa_instalacao", "custo_manutencao",
                "mensal_terceirizada", "chip_mensal", "custos_softwares", "mao_de_obra", "data_inst")
CAMPOS_ITEM = ("categoria", "cod", "material", "qtd", "valor_unit")


def _num(valor) -> float:
    try:
        return float(valor or 0)
    except (TypeError, ValueError):
        return 0.0


def _nome_arquivo(nome: str) -> str:
    base = re.sub(r"[^A-Za-z0-9_-]+", "_", nome).strip("_") or "Projeto"
    return quote(base)


def _workbook(projeto_id: int) -> loader.WorkbookData:
    locais = []
    for linha in projetos_store.listar_locais(projeto_id):
        local = loader.Local(
            nome=linha["nome"],
            valor_mensal=_num(linha["valor_mensal"]),
            taxa_instalacao=_num(linha["taxa_instalacao"]),
            custo_manutencao=_num(linha["custo_manutencao"]),
            mensal_terceirizada=_num(linha["mensal_terceirizada"]),
            chip_mensal=_num(linha["chip_mensal"]),
            custos_softwares=_num(linha["custos_softwares"]),
            mao_de_obra=_num(linha["mao_de_obra"]),
            data_inst=loader._to_date(linha["data_inst"]),
        )
        local.id = linha["id"]
        local.itens = []
        for linha_item in projetos_store.listar_itens(linha["id"]):
            item = loader.Item(
                cod=str(linha_item["cod"] or ""),
                material=str(linha_item["material"] or ""),
                qtd=_num(linha_item["qtd"]),
                valor_unit=_num(linha_item["valor_unit"]),
                valor_total=_num(linha_item["valor_total"]),
                categoria=str(linha_item["categoria"] or ""),
            )
            item.id = linha_item["id"]
            local.itens.append(item)
        locais.append(local)
    return loader.WorkbookData(locais=locais, avisos=[])


def _graficos_local(local: loader.Local) -> dict:
    return {
        "composicao": charts.grafico_composicao_investimento(local).to_json(),
        "categorias": charts.grafico_categorias(local).to_json(),
        "pareto": charts.grafico_pareto(local).to_json(),
        "payback": charts.grafico_payback(local).to_json(),
    }


def _payload_projeto(workbook: loader.WorkbookData, nome_projeto: str) -> dict:
    locais = []
    for local in workbook.locais:
        payload_local = serialize.local_payload(
            local,
            insights.gerar_insights(local),
            _graficos_local(local),
        )
        payload_local["id"] = getattr(local, "id", None)
        for payload_item, item_obj in zip(payload_local["itens"], local.itens):
            payload_item["id"] = getattr(item_obj, "id", None)
        payload_local["fluxo"] = {
            str(horizonte): {
                **analysis.fluxo_caixa(local, horizonte),
                "grafico": charts.grafico_fluxo_caixa(local, horizonte).to_json(),
            }
            for horizonte in HORIZONTES_FLUXO
        }
        locais.append(payload_local)

    resumo_projeto = analysis.resumo_projeto(workbook.locais)
    projeto = {
        "locais": [serialize.resumo_payload(r) for r in resumo_projeto["locais"]],
        "totais": resumo_projeto["totais"],
        "graficos": {
            "investimento": charts.grafico_barras_comparativo(workbook.locais, "investimento", "Investimento por local").to_json(),
            "saldo": charts.grafico_barras_comparativo(workbook.locais, "saldo_mensal", "Saldo mensal por local").to_json(),
            "retorno": charts.grafico_barras_comparativo(workbook.locais, "tempo_retorno", "Tempo de retorno por local", e_meses=True).to_json(),
            "dispersao": charts.grafico_dispersao(workbook.locais).to_json(),
        },
    }

    return {
        "filename": nome_projeto,
        "avisos": workbook.avisos,
        "locais": locais,
        "projeto": projeto,
    }


def _projeto_ou_404(projeto_id: int) -> dict:
    projeto = projetos_store.get_projeto(projeto_id)
    if not projeto:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    return projeto


def _local_ou_404(local_id: int) -> dict:
    local = projetos_store.get_local(local_id)
    if not local:
        raise HTTPException(status_code=404, detail="Local não encontrado.")
    return local


def _item_ou_404(item_id: int) -> dict:
    item = projetos_store.get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado.")
    return item


@router.get("")
def listar(usuario: dict = Depends(usuario_atual)) -> list[dict]:
    escopo_cliente = usuario["id"] if usuario["papel"] == "cliente" else None
    projetos = []
    for projeto in projetos_store.listar_projetos(cliente_usuario_id=escopo_cliente):
        workbook = _workbook(projeto["id"])
        totais = analysis.resumo_projeto(workbook.locais)["totais"]
        projetos.append(
            {
                "id": projeto["id"],
                "nome": projeto["nome"],
                "cliente": projeto.get("cliente"),
                "cliente_usuario_id": projeto.get("cliente_usuario_id"),
                "criado_em": projeto.get("criado_em"),
                "num_locais": totais["num_locais"],
                "num_itens": totais["num_itens"],
                "totais": {
                    "receita_mensal": totais["receita_mensal"],
                    "saldo_mensal": totais["saldo_mensal"],
                    "investimento": totais["investimento"],
                },
            }
        )
    return projetos


@router.post("")
def criar(dados: dict, usuario: dict = Depends(admin_obrigatorio)) -> dict:
    nome = str(dados.get("nome") or "").strip()
    if not nome:
        raise HTTPException(status_code=400, detail="Informe o nome do projeto.")
    cliente = str(dados.get("cliente") or "").strip() or None
    cliente_uid = dados.get("cliente_usuario_id")
    if cliente_uid is not None:
        try:
            cliente_uid = int(cliente_uid)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="cliente_usuario_id inválido.")
    return projetos_store.criar_projeto(nome, cliente, cliente_usuario_id=cliente_uid)


@router.patch("/{projeto_id}")
def renomear(projeto_id: int, dados: dict, usuario: dict = Depends(admin_obrigatorio)) -> dict:
    _projeto_ou_404(projeto_id)
    projeto = projetos_store.renomear_projeto(
        projeto_id,
        nome=dados.get("nome"),
        cliente=dados.get("cliente"),
        cliente_usuario_id=dados.get("cliente_usuario_id", projetos_store._SEM_ALTERAR),
    )
    return projeto or {}


@router.delete("/{projeto_id}", status_code=204)
def excluir(projeto_id: int, usuario: dict = Depends(admin_obrigatorio)) -> None:
    if not projetos_store.excluir_projeto(projeto_id):
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")


@router.get("/{projeto_id}")
def dashboard(projeto_id: int, usuario: dict = Depends(usuario_atual)) -> dict:
    projeto = exigir_projeto(usuario, projeto_id)
    return _payload_projeto(_workbook(projeto_id), projeto["nome"])


@router.post("/{projeto_id}/locais")
def criar_local(projeto_id: int, dados: dict, usuario: dict = Depends(admin_obrigatorio)) -> dict:
    _projeto_ou_404(projeto_id)
    nome = str(dados.get("nome") or "").strip()
    if not nome:
        raise HTTPException(status_code=400, detail="Informe o nome do local.")
    return projetos_store.criar_local(projeto_id, dados)


@router.patch("/{projeto_id}/locais/{local_id}")
def atualizar_local(projeto_id: int, local_id: int, dados: dict, usuario: dict = Depends(admin_obrigatorio)) -> dict:
    _projeto_ou_404(projeto_id)
    local = _local_ou_404(local_id)
    if int(local["projeto_id"]) != projeto_id:
        raise HTTPException(status_code=404, detail="Local não encontrado.")
    atualizado = projetos_store.atualizar_local(local_id, {k: v for k, v in dados.items() if k in CAMPOS_LOCAL})
    return atualizado or {}


@router.delete("/{projeto_id}/locais/{local_id}", status_code=204)
def excluir_local(projeto_id: int, local_id: int, usuario: dict = Depends(admin_obrigatorio)) -> None:
    _projeto_ou_404(projeto_id)
    local = _local_ou_404(local_id)
    if int(local["projeto_id"]) != projeto_id:
        raise HTTPException(status_code=404, detail="Local não encontrado.")
    projetos_store.excluir_local(local_id)


@router.post("/locais/{local_id}/itens")
def criar_item(local_id: int, dados: dict, usuario: dict = Depends(admin_obrigatorio)) -> dict:
    _local_ou_404(local_id)
    if not str(dados.get("material") or "").strip():
        raise HTTPException(status_code=400, detail="Informe o material do item.")
    return projetos_store.criar_item(local_id, dados)


@router.patch("/itens/{item_id}")
def atualizar_item(item_id: int, dados: dict, usuario: dict = Depends(admin_obrigatorio)) -> dict:
    _item_ou_404(item_id)
    atualizado = projetos_store.atualizar_item(item_id, {k: v for k, v in dados.items() if k in CAMPOS_ITEM})
    return atualizado or {}


@router.delete("/itens/{item_id}", status_code=204)
def excluir_item(item_id: int, usuario: dict = Depends(admin_obrigatorio)) -> None:
    if not projetos_store.excluir_item(item_id):
        raise HTTPException(status_code=404, detail="Item não encontrado.")


@router.get("/{projeto_id}/planilha.xlsx")
def exportar_planilha(projeto_id: int, usuario: dict = Depends(usuario_atual)) -> Response:
    projeto = exigir_projeto(usuario, projeto_id)
    buffer = planilha_export.montar_planilha(_workbook(projeto_id))
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": (
                f"attachment; filename*=UTF-8''Planilha_{_nome_arquivo(projeto['nome'])}.xlsx"
            )
        },
    )


@router.post("/{projeto_id}/relatorio")
def relatorio(projeto_id: int, usuario: dict = Depends(usuario_atual)) -> Response:
    projeto = exigir_projeto(usuario, projeto_id)
    workbook = _workbook(projeto_id)
    if not workbook.locais:
        raise HTTPException(status_code=400, detail="Projeto sem locais para gerar o relatório.")
    pdf_bytes = report.gerar_pdf(f"{projeto['nome']}.xlsx", workbook.locais)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f"attachment; filename*=UTF-8''Dashboard_Financeiro_{_nome_arquivo(projeto['nome'])}.pdf"
            )
        },
    )


@router.post("/importar")
def importar(
    arquivo: UploadFile = File(...),
    nome: str | None = None,
    usuario: dict = Depends(admin_obrigatorio),
) -> dict:
    if not arquivo.filename or not arquivo.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="O arquivo precisa ser .xlsx no template padrão.")
    dados_bytes = arquivo.file.read()
    try:
        workbook = loader.carregar(dados_bytes)
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))
    except Exception as erro:
        raise HTTPException(status_code=400, detail=f"Erro ao ler o arquivo: {erro}")

    nome_projeto = (nome or "").strip() or arquivo.filename.rsplit(".", 1)[0].strip()
    projeto = projetos_store.criar_projeto(nome_projeto)
    for local in workbook.locais:
        criado = projetos_store.criar_local(
            projeto["id"],
            {
                "nome": local.nome,
                "valor_mensal": local.valor_mensal,
                "taxa_instalacao": local.taxa_instalacao,
                "custo_manutencao": local.custo_manutencao,
                "mensal_terceirizada": local.mensal_terceirizada,
                "chip_mensal": local.chip_mensal,
                "custos_softwares": local.custos_softwares,
                "mao_de_obra": local.mao_de_obra,
                "data_inst": local.data_inst.isoformat() if local.data_inst else None,
            },
        )
        for item in local.itens:
            projetos_store.criar_item(
                criado["id"],
                {
                    "categoria": item.categoria,
                    "cod": item.cod,
                    "material": item.material,
                    "qtd": item.qtd,
                    "valor_unit": item.valor_unit,
                },
            )
    return {"id": projeto["id"], "nome": projeto["nome"], "avisos": workbook.avisos}
