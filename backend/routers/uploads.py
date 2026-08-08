from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

import analysis
import charts
import insights
import loader
import serialize
from deps import usuario_atual

router = APIRouter(prefix="/uploads", tags=["uploads"])

HORIZONTES_FLUXO = (6, 12, 24, 36)


def _graficos_local(local: loader.Local) -> dict:
    return {
        "composicao": charts.grafico_composicao_investimento(local).to_json(),
        "categorias": charts.grafico_categorias(local).to_json(),
        "pareto": charts.grafico_pareto(local).to_json(),
        "payback": charts.grafico_payback(local).to_json(),
    }


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

    locais = []
    for local in workbook.locais:
        payload_local = serialize.local_payload(
            local,
            insights.gerar_insights(local),
            _graficos_local(local),
        )
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
        "filename": arquivo.filename,
        "avisos": workbook.avisos,
        "locais": locais,
        "projeto": projeto,
    }
