import sys

import analysis
import history
import insights
import loader
import report

CAMINHO_DEFAULT = r"C:\Users\assistentesolucoes\Desktop\opencode base.xlsx"
CAMINHO_SEGUNDA = r"C:\Users\assistentesolucoes\Downloads\1- CUSTOS DISPENSA ELETRÔNICA 9074-2026 (14ª CRS SANTA ROSA ) RETORNO 20 MESES.xlsx"


def aproximado(real, esperado, tolerancia=0.01) -> bool:
    return real is not None and abs(real - esperado) <= tolerancia


def testar_arquivo(caminho: str, locais_esperados: int, campos_esperados: list[tuple]) -> None:
    print(f"\n=== Arquivo: {caminho.split(chr(92))[-1]} ===")
    workbook = loader.carregar(caminho)
    if workbook.avisos:
        print("AVISOS:")
        for aviso in workbook.avisos:
            print(f"  - {aviso}")
    assert len(workbook.locais) == locais_esperados, (
        f"Esperava {locais_esperados} local(is), veio {len(workbook.locais)}"
    )
    local = workbook.locais[0]
    print(f"Local: {local.nome}")
    resumo = analysis.resumo(local)
    for campo, esperado in campos_esperados:
        real = resumo[campo]
        ok = aproximado(real, esperado) or real == esperado
        print(f"  {campo:22s} = {real!r:>12}  {'OK' if ok else 'FALHOU (esperado ' + str(esperado) + ')'}")
        assert ok, f"{campo}: esperado {esperado}, veio {real}"
    return workbook


def main() -> None:
    caminho = sys.argv[1] if len(sys.argv) > 1 else CAMINHO_DEFAULT
    print(f"Carregando: {caminho}")

    if caminho == CAMINHO_DEFAULT:
        workbook = testar_arquivo(
            caminho,
            1,
            [
                ("valor_mensal", 1150.00),
                ("taxa_instalacao", 0.00),
                ("impostos", 172.50),
                ("saldo_apos_impostos", 977.50),
                ("saldo_mensal", 800.73),
                ("mao_de_obra", 2000.00),
                ("equipamento", 16733.28),
                ("investimento", 18733.28),
                ("tempo_retorno", 23.40),
                ("meses_retorno", 24),
                ("margem", 0.6963),
                ("receita_anual", 13800.00),
            ],
        )
    else:
        workbook = testar_arquivo(
            caminho,
            1,
            [
                ("valor_mensal", 470.00),
                ("taxa_instalacao", 0.00),
                ("impostos", 70.50),
                ("saldo_apos_impostos", 399.50),
                ("saldo_mensal", 252.73),
                ("mao_de_obra", 700.00),
                ("equipamento", 4439.12),
                ("investimento", 5139.12),
                ("tempo_retorno", 20.33),
                ("meses_retorno", 21),
                ("margem", 0.5377),
            ],
        )

    if caminho != CAMINHO_DEFAULT:
        print("\nSegunda planilha validada — encerrando")
        return

    local = workbook.locais[0]

    print(f"\nData de instalação: {local.data_inst}")

    categorias = analysis.por_categoria(local)
    total_cat = sum(c["valor"] for c in categorias)
    print(f"\nCategorias ({len(categorias)}): {[(c['categoria'], round(c['valor'], 2), round(c['pct'], 1)) for c in categorias]}")
    assert len(categorias) == 2, f"Esperava 2 categorias, veio {len(categorias)}"
    assert aproximado(total_cat, local.equipamento, 0.5), "Soma das categorias != equipamento"

    pareto = analysis.pareto(local, 5)
    print(f"\nTop 5 itens: {[(p['material'][:40], round(p['valor'], 2), round(p['pct_acumulado'], 1)) for p in pareto]}")

    anomalias = analysis.anomalias_preco_unitario(local)
    print(f"\nAnomalias de preço unitário: {[(a['material'][:40], round(a['z_score'], 1)) for a in anomalias]}")

    curva = analysis.curva_payback(local)
    print(f"\nCurva de payback: {len(curva)} pontos, payback em {curva[-1]['mes']} meses")

    print("\nINSIGHTS:")
    for insight in insights.gerar_insights(local):
        print(f"  [{insight['severidade']:7s}] {insight['texto']}")

    print("\nSalvando snapshot no histórico...")
    with open(caminho, "rb") as arquivo:
        sha = history.sha256_de_bytes(arquivo.read())
    upload_id = history.salvar_snapshot(sha, caminho.split("\\")[-1], workbook.locais)
    print(f"  Snapshot id={upload_id} salvo")
    historico = history.carregar_historico_locais()
    print(f"  Histórico: {len(historico)} linha(s)")
    assert not historico.empty
    assert upload_id in historico["upload_id"].tolist()

    print("\nReconstruindo análise a partir do banco...")
    wb2 = history.carregar_workbook(upload_id)
    l2 = wb2.locais[0]
    assert abs(local.equipamento - l2.equipamento) < 0.01, "equipamento divergiu"
    assert abs(local.investimento - l2.investimento) < 0.01, "investimento divergiu"
    assert abs(local.saldo_mensal - l2.saldo_mensal) < 0.01, "saldo divergiu"
    assert len(local.itens) == len(l2.itens), "itens divergiram"
    assert l2.data_inst is not None, "data de instalação não reconstruída"
    print("  Reconstrução OK")

    print("\nGerando PDF...")
    pdf = report.gerar_pdf(caminho.split("\\")[-1], workbook.locais, "teste")
    assert pdf[:4] == b"%PDF", "PDF inválido"
    print(f"  PDF: {len(pdf)} bytes OK")

    print("\nTODOS OS TESTES PASSARAM")


if __name__ == "__main__":
    main()
