import datetime

import pandas as pd
import streamlit as st

import analysis
import charts
import history
import insights
import loader

st.set_page_config(page_title="Custo Dashboard", layout="wide")

CORES = {"ok": "#16a34a", "atencao": "#d97706", "alerta": "#dc2626", "dica": "#2563eb"}
TITULOS = {"ok": "OK", "atencao": "Atenção", "alerta": "Alerta", "dica": "Dica"}


def fmt_moeda(valor) -> str:
    if valor is None:
        return "—"
    return f"R$ {valor:,.2f}".replace(",", "§").replace(".", ",").replace("§", ".")


def fmt_numero(valor, casas: int = 1) -> str:
    if valor is None:
        return "—"
    return f"{valor:,.{casas}f}".replace(",", "§").replace(".", ",").replace("§", ".")


def cartao_kpi(rotulo: str, valor: str, cor: str = "#2563eb") -> None:
    st.markdown(
        f"""
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;
             padding:14px 18px;margin-bottom:10px;border-left:4px solid {cor};">
            <div style="font-size:12px;color:#6b7280;text-transform:uppercase;">{rotulo}</div>
            <div style="font-size:24px;font-weight:700;color:#111827;">{valor}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_insights(local) -> None:
    for insight in insights.gerar_insights(local):
        cor = CORES[insight["severidade"]]
        st.markdown(
            f"""
            <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;
                 padding:10px 14px;margin-bottom:8px;border-left:4px solid {cor};">
                <span style="color:{cor};font-weight:700;font-size:12px;">{TITULOS[insight['severidade']]}</span>
                <span style="color:#111827;"> — {insight['texto']}</span>
            </div>
            """,
            unsafe_allow_html=True,
        )


def dados_carregados() -> loader.WorkbookData | None:
    return st.session_state.get("dados")


def main() -> None:
    st.title("Custo Dashboard")
    st.caption("Upload de planilha de custo (.xlsx) no template padrão → análise automática.")

    with st.sidebar:
        st.header("Entrada de dados")
        arquivo = st.file_uploader("Planilha de custo (.xlsx)", type=["xlsx"])

        if arquivo is not None:
            try:
                dados_bytes = arquivo.getvalue()
                sha = history.sha256_de_bytes(dados_bytes)
                workbook = loader.carregar(dados_bytes)
                history.salvar_snapshot(sha, arquivo.name, workbook.locais)
                st.session_state["dados"] = workbook
                st.session_state["arquivo_atual"] = arquivo.name
                st.success(f"Carregado: {arquivo.name}")
                for aviso in workbook.avisos:
                    st.warning(aviso)
            except ValueError as erro:
                st.error(str(erro))
            except Exception as erro:
                st.error(f"Erro inesperado ao ler o arquivo: {erro}")

    workbook = dados_carregados()
    if workbook is None:
        st.info("Envie uma planilha no template padrão (abas RELATORIO + equipamento) para gerar o dashboard.")
        uploads = history.listar_uploads()
        if not uploads.empty:
            st.subheader("Últimos arquivos carregados")
            st.dataframe(uploads[["filename", "uploaded_at"]], hide_index=True)
        return

    if workbook.avisos:
        for aviso in workbook.avisos:
            st.warning(aviso)

    nomes_locais = [local.nome for local in workbook.locais]
    local_selecionado = st.sidebar.selectbox("Local", nomes_locais, key="local_atual")
    local = next(l for l in workbook.locais if l.nome == local_selecionado)

    aba_geral, aba_custos, aba_payback, aba_insights, aba_historico = st.tabs(
        ["Visão Geral", "Custos", "Payback", "Insights", "Histórico"]
    )

    with aba_geral:
        resumo = analysis.resumo(local)
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            cartao_kpi("Receita mensal", fmt_moeda(resumo["valor_mensal"]), "#2563eb")
            cartao_kpi("Receita anual", fmt_moeda(resumo["receita_anual"]), "#2563eb")
        with col2:
            cartao_kpi("Saldo mensal", fmt_moeda(resumo["saldo_mensal"]), "#16a34a")
            cartao_kpi("Impostos (15%)", fmt_moeda(resumo["impostos"]), "#6b7280")
        with col3:
            cartao_kpi("Investimento", fmt_moeda(resumo["investimento"]), "#f59e0b")
            cartao_kpi("Equipamento", fmt_moeda(resumo["equipamento"]), "#f59e0b")
        with col4:
            cartao_kpi("Tempo de retorno", f"{fmt_numero(resumo['tempo_retorno'])} meses", "#dc2626")
            data_inst = local.data_inst.strftime("%d/%m/%Y") if local.data_inst else "—"
            cartao_kpi("Instalação", data_inst, "#6b7280")

        st.subheader("Resumo do local")
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
            st.plotly_chart(charts.grafico_composicao_investimento(local), use_container_width=True)
        with col2:
            st.plotly_chart(charts.grafico_categorias(local), use_container_width=True)
        st.plotly_chart(charts.grafico_pareto(local), use_container_width=True)

        st.subheader("Itens de equipamento")
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
        st.dataframe(itens_df, hide_index=True, use_container_width=True)

    with aba_payback:
        st.plotly_chart(charts.grafico_payback(local), use_container_width=True)
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
            st.subheader("Uploads")
            uploads = history.listar_uploads()
            for _, linha in uploads.iterrows():
                col1, col2, col3 = st.columns([3, 2, 1])
                with col1:
                    st.write(linha["filename"])
                with col2:
                    st.write(linha["uploaded_at"])
                with col3:
                    if st.button("Excluir", key=f"del_{linha['id']}"):
                        history.excluir_upload(int(linha["id"]))
                        st.rerun()

            st.subheader("Evolução por local")
            locais_hist = sorted(historico["local"].unique())
            local_hist = st.selectbox("Local (histórico)", locais_hist, key="local_hist")
            df_local = historico[historico["local"] == local_hist].copy()
            df_local["uploaded_at"] = pd.to_datetime(df_local["uploaded_at"])
            df_local = df_local.sort_values("uploaded_at")
            st.plotly_chart(
                charts.grafico_historico(df_local, "investimento", "Investimento por upload"),
                use_container_width=True,
            )
            st.plotly_chart(
                charts.grafico_historico(df_local, "saldo_mensal", "Saldo mensal por upload"),
                use_container_width=True,
            )
            df_retorno = df_local.dropna(subset=["tempo_retorno"])
            if not df_retorno.empty:
                st.plotly_chart(
                    charts.grafico_historico(df_retorno, "tempo_retorno", "Tempo de retorno (meses) por upload"),
                    use_container_width=True,
                )


if __name__ == "__main__":
    main()
