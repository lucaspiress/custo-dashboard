import re

import pandas as pd
import streamlit as st

import analysis
import charts
import formatos
import history
import insights
import loader
import report
import theme

st.set_page_config(page_title="Custo Dashboard", layout="wide")

st.markdown(f"<style>{theme.CSS_APP}</style>", unsafe_allow_html=True)

fmt_moeda = formatos.fmt_moeda
fmt_numero = formatos.fmt_numero

MARCA_SVG = (
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" '
    'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20V7"/></svg>'
)


def cabecalho() -> None:
    st.markdown(
        f"""
        <div class="cabecalho-marca">
            <div class="marca">{MARCA_SVG}</div>
            <div>
                <div class="titulo">Custo Dashboard</div>
                <div class="subtitulo">Análise automática de planilhas de custo — relatório, payback e insights</div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def cartao_kpi(rotulo: str, valor: str, sub: str | None = None, cor: str = "#1E40AF", atraso: int = 0) -> None:
    sub_html = f'<div class="kpi-sub">{sub}</div>' if sub else ""
    st.markdown(
        f"""
        <div class="kpi-card" style="--kpi-cor:{cor};animation-delay:{atraso}ms">
            <div class="kpi-topo">
                <span class="kpi-ponto"></span>
                <div class="kpi-label">{rotulo}</div>
            </div>
            <div class="kpi-value">{valor}</div>
            {sub_html}
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_insights(local) -> None:
    for indice, insight in enumerate(insights.gerar_insights(local)):
        severidade = insight["severidade"]
        cor = theme.SEVERIDADE_COR[severidade]
        fundo = theme.SEVERIDADE_FUNDO[severidade]
        borda = theme.SEVERIDADE_BORDA[severidade]
        rotulo = {"ok": "OK", "atencao": "Atenção", "alerta": "Alerta", "dica": "Dica"}[severidade]
        st.markdown(
            f"""
            <div class="insight-card" style="--insight-cor:{cor};--insight-fundo:{fundo};--insight-borda:{borda};animation-delay:{indice * 60}ms">
                <span class="insight-pill">{rotulo}</span>
                <span class="insight-texto">{insight['texto']}</span>
            </div>
            """,
            unsafe_allow_html=True,
        )


def carregar_snapshot_inicial() -> None:
    if "dados" in st.session_state:
        return
    historico = history.carregar_historico_locais()
    if not historico.empty:
        ultimo = int(historico.iloc[0]["upload_id"])
        st.session_state["dados"] = history.carregar_workbook(ultimo)
        st.session_state["snapshot_ativo"] = ultimo
        st.session_state["fonte"] = (
            f"Último upload: {historico.iloc[0]['filename']} ({historico.iloc[0]['uploaded_at']})"
        )
    else:
        st.session_state["fonte"] = None


def main() -> None:
    cabecalho()
    carregar_snapshot_inicial()

    uploads = history.listar_uploads()

    with st.sidebar:
        st.header("Entrada de dados")
        arquivo = st.file_uploader("Planilha de custo (.xlsx)", type=["xlsx"])

        if arquivo is not None:
            try:
                dados_bytes = arquivo.getvalue()
                sha = history.sha256_de_bytes(dados_bytes)
                workbook = loader.carregar(dados_bytes)
                upload_id = history.salvar_snapshot(sha, arquivo.name, workbook.locais)
                st.session_state["dados"] = workbook
                st.session_state["fonte"] = f"Upload: {arquivo.name}"
                st.session_state["snapshot_ativo"] = upload_id
                st.session_state.pop("ver_analise", None)
                st.session_state.pop("local_atual", None)
                st.success(f"Carregado: {arquivo.name}")
                for aviso in workbook.avisos:
                    st.warning(aviso)
                st.rerun()
            except ValueError as erro:
                st.error(str(erro))
                st.warning(
                    "O arquivo precisa seguir o template: aba 'RELATORIO' com coluna LOCAL "
                    "e abas de equipamento por local (MATERIAL ALARME / MATERIAL CFTV)."
                )
            except Exception as erro:
                st.error(f"Erro inesperado ao ler o arquivo: {erro}")

        if not uploads.empty:
            opcoes = []
            mapa = {}
            atual = uploads.iloc[0]
            opcoes.append(f"Arquivo atual: {atual['filename']} ({atual['uploaded_at']})")
            mapa[opcoes[0]] = int(atual["id"])
            for _, linha in uploads.iloc[1:].iterrows():
                rotulo = f"{linha['filename']} ({linha['uploaded_at']})"
                opcoes.append(rotulo)
                mapa[rotulo] = int(linha["id"])
            if "ver_analise" in st.session_state and st.session_state["ver_analise"] not in opcoes:
                del st.session_state["ver_analise"]
            escolha = st.selectbox("Ver análise de", opcoes, key="ver_analise")
            id_escolhido = mapa[escolha]
            if id_escolhido != st.session_state.get("snapshot_ativo"):
                st.session_state["snapshot_ativo"] = id_escolhido
                st.session_state["dados"] = history.carregar_workbook(id_escolhido)
                st.session_state["fonte"] = escolha
                st.session_state.pop("local_atual", None)
                st.rerun()

    fonte = st.session_state.get("fonte")
    if fonte:
        nome_arquivo = fonte.split(": ", 1)[-1] if ": " in fonte else fonte
        st.markdown(
            f'<div class="cabecalho-fonte">Exibindo: <span>{nome_arquivo}</span></div>',
            unsafe_allow_html=True,
        )

    workbook = st.session_state.get("dados")
    if workbook is None:
        st.markdown(
            f"""
            <div style="background:{theme.COR['superficie']};border:1px solid {theme.COR['borda']};
                 border-radius:12px;padding:28px 24px;text-align:center;margin-top:8px;">
                <div style="font-size:15px;font-weight:600;color:{theme.COR['tinta']};margin-bottom:6px;">
                    Nenhuma análise carregada ainda
                </div>
                <div style="font-size:13px;color:{theme.COR['mutado']};line-height:1.6;">
                    Envie uma planilha de custo no template padrão pela barra lateral.<br/>
                    O arquivo precisa ter a aba <b>RELATORIO</b> (coluna LOCAL) e abas de equipamento
                    (MATERIAL ALARME / MATERIAL CFTV) — exatamente como o template usado.
                </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        if not uploads.empty:
            st.markdown('<div class="secao-titulo">Últimos arquivos carregados</div>', unsafe_allow_html=True)
            st.dataframe(uploads[["filename", "uploaded_at"]], hide_index=True)
        return

    for aviso in workbook.avisos:
        st.warning(aviso)

    nomes_locais = [local.nome for local in workbook.locais]
    local_selecionado = st.sidebar.selectbox("Local", nomes_locais, key="local_atual")
    local = next(l for l in workbook.locais if l.nome == local_selecionado)

    uploaded_at = None
    nome_snapshot = "planilha.xlsx"
    for _, linha in uploads.iterrows():
        if int(linha["id"]) == st.session_state.get("snapshot_ativo"):
            uploaded_at = linha["uploaded_at"]
            nome_snapshot = linha["filename"]
            break

    pdf_bytes = report.gerar_pdf(nome_snapshot, workbook.locais, uploaded_at)
    nome_pdf = re.sub(r"[^A-Za-z0-9_-]+", "_", nome_snapshot.rsplit(".", 1)[0]).strip("_")
    st.sidebar.download_button(
        "Baixar relatório em PDF",
        data=pdf_bytes,
        file_name=f"Dashboard_Financeiro_{nome_pdf or 'Projeto'}.pdf",
        mime="application/pdf",
    )

    aba_geral, aba_custos, aba_payback, aba_insights, aba_historico = st.tabs(
        ["Visão Geral", "Custos", "Payback", "Insights", "Histórico"]
    )

    with aba_geral:
        resumo = analysis.resumo(local)
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            cartao_kpi("Receita mensal", fmt_moeda(resumo["valor_mensal"]), "Mensalidade do contrato", theme.KPI_CORES["Receita mensal"], 0)
            cartao_kpi("Receita anual", fmt_moeda(resumo["receita_anual"]), "12 meses + taxa de instalação", theme.KPI_CORES["Receita anual"], 60)
        with col2:
            saldo = fmt_moeda(resumo["saldo_mensal"])
            sub = None
            if resumo["margem"] is not None:
                sub = f"Margem de {resumo['margem'] * 100:.1f}% sobre a receita"
            cartao_kpi("Saldo mensal", saldo, sub, theme.KPI_CORES["Saldo mensal"], 120)
            cartao_kpi("Impostos (15%)", fmt_moeda(resumo["impostos"]), "Sobre a receita mensal", theme.KPI_CORES["Impostos (15%)"], 180)
        with col3:
            cartao_kpi("Investimento", fmt_moeda(resumo["investimento"]), "Mão de obra + equipamento", theme.KPI_CORES["Investimento"], 240)
            cartao_kpi("Equipamento", fmt_moeda(resumo["equipamento"]), "Itens da proposta", theme.KPI_CORES["Equipamento"], 300)
        with col4:
            retorno = f"{fmt_numero(resumo['tempo_retorno'])} meses"
            cartao_kpi("Tempo de retorno", retorno, "Payback do investimento", theme.KPI_CORES["Tempo de retorno"], 360)
            data_inst = local.data_inst.strftime("%d/%m/%Y") if local.data_inst else "—"
            cartao_kpi("Instalação", data_inst, "Data prevista / realizada", theme.KPI_CORES["Instalação"], 420)

        st.markdown('<div class="secao-titulo">Resumo do local</div>', unsafe_allow_html=True)
        linhas = []
        for l in workbook.locais:
            r = analysis.resumo(l)
            linhas.append(
                {
                    "Local": r["local"],
                    "Receita mensal": fmt_moeda(r["valor_mensal"]),
                    "Saldo mensal": fmt_moeda(r["saldo_mensal"]),
                    "Mão de obra": fmt_moeda(r["mao_de_obra"]),
                    "Equipamento": fmt_moeda(r["equipamento"]),
                    "Investimento": fmt_moeda(r["investimento"]),
                    "Retorno (meses)": fmt_numero(r["tempo_retorno"]),
                    "Itens": r["num_itens"],
                }
            )
        st.dataframe(pd.DataFrame(linhas), hide_index=True)

    with aba_custos:
        col1, col2 = st.columns(2)
        with col1:
            st.plotly_chart(charts.grafico_composicao_investimento(local), width="stretch")
        with col2:
            st.plotly_chart(charts.grafico_categorias(local), width="stretch")
        st.plotly_chart(charts.grafico_pareto(local), width="stretch")

        st.markdown('<div class="secao-titulo">Itens de equipamento</div>', unsafe_allow_html=True)
        itens_df = pd.DataFrame(
            [
                {
                    "Categoria": item.categoria,
                    "Código": item.cod,
                    "Material": item.material,
                    "Qtd": item.qtd,
                    "Valor unit.": fmt_moeda(item.valor_unit),
                    "Valor total": fmt_moeda(item.valor_total),
                }
                for item in sorted(local.itens, key=lambda i: i.valor_total, reverse=True)
            ]
        )
        st.dataframe(itens_df, hide_index=True, width="stretch")

    with aba_payback:
        st.plotly_chart(charts.grafico_payback(local), width="stretch")
        curva = analysis.curva_payback(local)
        if curva:
            st.caption(
                f"Payback em {curva[-1]['mes']} meses com saldo constante de {fmt_moeda(local.saldo_mensal)}/mês."
            )

    with aba_insights:
        render_insights(local)

    with aba_historico:
        historico = history.carregar_historico_locais()
        if historico.empty:
            st.info("Nenhum histórico ainda — cada upload vira um snapshot comparável.")
        else:
            st.markdown('<div class="secao-titulo">Uploads</div>', unsafe_allow_html=True)
            ativo = st.session_state.get("snapshot_ativo")
            for _, linha in uploads.iterrows():
                col1, col2, col3, col4 = st.columns([0.4, 2.6, 2, 0.8])
                with col1:
                    marcador = "●" if int(linha["id"]) == ativo else " "
                    st.markdown(f"<span style='color:{theme.COR['primaria']}'>{marcador}</span>", unsafe_allow_html=True)
                with col2:
                    st.write(linha["filename"])
                with col3:
                    st.write(linha["uploaded_at"])
                with col4:
                    if st.button("Excluir", key=f"del_{linha['id']}"):
                        history.excluir_upload(int(linha["id"]))
                        st.rerun()

            st.markdown('<div class="secao-titulo">Evolução por local</div>', unsafe_allow_html=True)
            locais_hist = sorted(historico["local"].unique())
            if "local_hist" in st.session_state and st.session_state["local_hist"] not in locais_hist:
                del st.session_state["local_hist"]
            local_hist = st.selectbox("Local (histórico)", locais_hist, key="local_hist")
            df_local = historico[historico["local"] == local_hist].copy()
            df_local["uploaded_at"] = pd.to_datetime(df_local["uploaded_at"])
            df_local = df_local.sort_values("uploaded_at")
            st.plotly_chart(
                charts.grafico_historico(df_local, "investimento", "Investimento por upload"),
                width="stretch",
            )
            st.plotly_chart(
                charts.grafico_historico(df_local, "saldo_mensal", "Saldo mensal por upload"),
                width="stretch",
            )
            df_retorno = df_local.dropna(subset=["tempo_retorno"])
            if not df_retorno.empty:
                st.plotly_chart(
                    charts.grafico_historico(df_retorno, "tempo_retorno", "Tempo de retorno (meses) por upload"),
                    width="stretch",
                )


if __name__ == "__main__":
    main()
