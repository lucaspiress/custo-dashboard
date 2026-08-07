from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

import analysis
import charts
import history
import insights
import loader
import serialize
import store
from deps import usuario_atual

router = APIRouter(prefix="/uploads", tags=["uploads"])


def _uploaded_at(valor) -> str | None:
    if valor is None:
        return None
    return str(valor)


def _graficos_local(local: loader.Local) -> dict:
    return {
        "composicao": charts.grafico_composicao_investimento(local).to_json(),
        "categorias": charts.grafico_categorias(local).to_json(),
        "pareto": charts.grafico_pareto(local).to_json(),
        "payback": charts.grafico_payback(local).to_json(),
    }


@router.get("")
def listar(usuario: dict = Depends(usuario_atual)) -> list[dict]:
    uploads = store.list_uploads(usuario["id"])
    return [
        {
            "id": int(linha["id"]),
            "filename": linha["filename"],
            "uploaded_at": _uploaded_at(linha["uploaded_at"]),
        }
        for _, linha in uploads.iterrows()
    ]


@router.post("")
def enviar(arquivo: UploadFile = File(...), usuario: dict = Depends(usuario_atual)) -> dict:
    if not arquivo.filename or not arquivo.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="O arquivo precisa ser .xlsx no template padrão.")
    dados_bytes = arquivo.file.read()
    try:
        workbook = loader.carregar(dados_bytes)
    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))
    except Exception as erro:
        raise HTTPException(status_code=400, detail=f"Erro ao ler o arquivo: {erro}")
    sha = history.sha256_de_bytes(dados_bytes)
    upload_id = store.save_snapshot(usuario["id"], sha, arquivo.filename, dados_bytes, workbook.locais)
    return {
        "id": upload_id,
        "filename": arquivo.filename,
        "avisos": workbook.avisos,
    }


def _carregar(usuario: dict, upload_id: int) -> loader.WorkbookData:
    try:
        return store.load_workbook(usuario["id"], upload_id)
    except ValueError as erro:
        raise HTTPException(status_code=404, detail=str(erro))


@router.get("/history")
def historico(usuario: dict = Depends(usuario_atual)) -> dict:
    df = store.history_locais(usuario["id"])
    registros = []
    for _, linha in df.iterrows():
        registro = {}
        for coluna in df.columns:
            valor = linha[coluna]
            if coluna in ("valor_mensal", "saldo_mensal", "investimento", "equipamento", "mao_de_obra", "tempo_retorno", "margem"):
                registro[coluna] = None if valor is None or str(valor) in ("", "nan") else float(valor)
            elif coluna == "upload_id":
                registro[coluna] = int(valor)
            else:
                registro[coluna] = str(valor) if valor is not None else None
        registros.append(registro)
    return {"registros": registros}


@router.get("/history/chart")
def grafico_historico(
    local: str,
    metrica: str = Query("investimento"),
    usuario: dict = Depends(usuario_atual),
) -> dict:
    import pandas as pd

    df = store.history_locais(usuario["id"])
    if df.empty:
        raise HTTPException(status_code=404, detail="Nenhum histórico ainda.")
    df = df[df["local"] == local]
    if df.empty:
        raise HTTPException(status_code=404, detail="Local não encontrado no histórico.")
    df = df.copy()
    df["uploaded_at"] = pd.to_datetime(df["uploaded_at"])
    df = df.sort_values("uploaded_at")
    e_meses = metrica == "tempo_retorno"
    if e_meses:
        df = df.dropna(subset=[metrica])
    if metrica not in df.columns or df.empty:
        raise HTTPException(status_code=404, detail="Métrica não disponível.")
    titulos = {
        "investimento": "Investimento por upload",
        "saldo_mensal": "Saldo mensal por upload",
        "tempo_retorno": "Tempo de retorno (meses) por upload",
    }
    return {
        "fig": charts.grafico_historico(df, metrica, f"{titulos.get(metrica, metrica)} — {local}").to_json()
    }


@router.get("/{upload_id}")
def analise(upload_id: int, usuario: dict = Depends(usuario_atual)) -> dict:
    workbook = _carregar(usuario, upload_id)
    uploads = store.list_uploads(usuario["id"])
    filename = None
    uploaded_at = None
    for _, linha in uploads.iterrows():
        if int(linha["id"]) == upload_id:
            filename = linha["filename"]
            uploaded_at = _uploaded_at(linha["uploaded_at"])
            break
    locais = []
    for local in workbook.locais:
        locais.append(
            serialize.local_payload(
                local,
                insights.gerar_insights(local),
                _graficos_local(local),
            )
        )
    return {
        "upload_id": upload_id,
        "filename": filename,
        "uploaded_at": uploaded_at,
        "avisos": workbook.avisos,
        "locais": locais,
    }


@router.get("/{upload_id}/project")
def projeto(upload_id: int, usuario: dict = Depends(usuario_atual)) -> dict:
    workbook = _carregar(usuario, upload_id)
    resumo_projeto = analysis.resumo_projeto(workbook.locais)
    return {
        "locais": [serialize.resumo_payload(r) for r in resumo_projeto["locais"]],
        "totais": resumo_projeto["totais"],
        "graficos": {
            "investimento": charts.grafico_barras_comparativo(workbook.locais, "investimento", "Investimento por local").to_json(),
            "saldo": charts.grafico_barras_comparativo(workbook.locais, "saldo_mensal", "Saldo mensal por local").to_json(),
            "retorno": charts.grafico_barras_comparativo(workbook.locais, "tempo_retorno", "Tempo de retorno por local", e_meses=True).to_json(),
            "dispersao": charts.grafico_dispersao(workbook.locais).to_json(),
        },
    }


@router.get("/{upload_id}/compare")
def comparar(
    upload_id: int,
    vs: int = Query(...),
    local: str | None = Query(None),
    usuario: dict = Depends(usuario_atual),
) -> dict:
    workbook_novo = _carregar(usuario, upload_id)
    workbook_anterior = _carregar(usuario, vs)
    nomes = [l.nome for l in workbook_novo.locais]
    if local is None:
        local = nomes[0] if nomes else ""
    if local not in nomes:
        raise HTTPException(status_code=404, detail="Local não encontrado no snapshot atual.")
    novo = next(l for l in workbook_novo.locais if l.nome == local)
    anterior = next((l for l in workbook_anterior.locais if l.nome == local), None)
    if anterior is None:
        raise HTTPException(
            status_code=404,
            detail=f"O local '{local}' não existe no snapshot anterior — impossível comparar.",
        )
    resultado = analysis.comparar_locais(anterior, novo)
    return {
        "upload_base": vs,
        "upload_comparado": upload_id,
        "local": local,
        "kpis": resultado["kpis"],
        "itens": resultado["itens"],
        "grafico": charts.grafico_delta_itens(resultado["itens"]).to_json(),
    }


@router.get("/{upload_id}/cashflow")
def fluxo(
    upload_id: int,
    meses: int = Query(12, ge=1, le=120),
    local: str | None = Query(None),
    usuario: dict = Depends(usuario_atual),
) -> dict:
    workbook = _carregar(usuario, upload_id)
    nomes = [l.nome for l in workbook.locais]
    if local is None:
        local = nomes[0] if nomes else ""
    if local not in nomes:
        raise HTTPException(status_code=404, detail="Local não encontrado.")
    local_obj = next(l for l in workbook.locais if l.nome == local)
    fluxo_dados = analysis.fluxo_caixa(local_obj, meses)
    return {
        **fluxo_dados,
        "grafico": charts.grafico_fluxo_caixa(local_obj, meses).to_json(),
    }


@router.delete("/{upload_id}")
def excluir(upload_id: int, usuario: dict = Depends(usuario_atual)) -> dict:
    store.delete_upload(usuario["id"], upload_id)
    return {"ok": True}
