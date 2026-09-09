import { useMemo, useState } from 'react'
import type { AnaliseUpload } from '../../lib/types'
import { fmtMoeda, fmtNumero, fmtPct } from '../../lib/format'
import { simularMonteCarlo, type ResultadoMonteCarlo } from '../../lib/montecarlo'
import PlotlyChart from '../PlotlyChart'
import KpiCard from '../KpiCard'

interface Props {
  analise: AnaliseUpload
}

function construirParetoGlobalJson(analise: AnaliseUpload): string {
  if (analise.projeto?.graficos?.pareto_global) {
    return analise.projeto.graficos.pareto_global
  }

  const itens = analise.locais.flatMap((l) => l.itens)
  const agrupado: Record<string, { material: string; categoria: string; valor: number }> = {}

  if (itens.length > 0) {
    for (const item of itens) {
      const chave = item.categoria || 'Geral'
      if (!agrupado[chave]) {
        agrupado[chave] = { material: chave, categoria: chave, valor: 0 }
      }
      agrupado[chave].valor += item.valor_total
    }
  } else {
    for (const l of analise.locais) {
      const chave = l.nome
      agrupado[chave] = { material: chave, categoria: 'Local', valor: l.resumo.investimento }
    }
  }

  const lista = Object.values(agrupado).sort((a, b) => b.valor - a.valor).slice(0, 15)
  const total = lista.reduce((acc, i) => acc + i.valor, 0) || 1

  let soma = 0
  const categorias = lista.map((i) => i.material)
  const valores = lista.map((i) => i.valor)
  const pcts = lista.map((i) => {
    soma += i.valor
    return Math.round((soma / total) * 100 * 10) / 10
  })

  return JSON.stringify({
    data: [
      {
        x: categorias,
        y: valores,
        type: 'bar',
        name: 'Valor (R$)',
        marker: { color: '#2e59f6', line: { color: '#ffffff', width: 1 } },
        hovertemplate: '<b>%{x}</b><br>Valor: R$ %{y:,.2f}<extra></extra>',
      },
      {
        x: categorias,
        y: pcts,
        type: 'scatter',
        mode: 'lines+markers',
        name: '% Acumulado',
        yaxis: 'y2',
        line: { color: '#f59e0b', width: 2.5, dash: 'dot' },
        marker: { size: 7, color: '#f59e0b' },
        hovertemplate: '<b>%{x}</b><br>% Acumulado: %{y:.1f}%<extra></extra>',
      },
    ],
    layout: {
      template: 'plotly_white',
      paper_bgcolor: 'var(--cor-superficie)',
      plot_bgcolor: 'var(--cor-superficie)',
      font: { family: 'Inter, sans-serif', color: '#8fa3c7', size: 11 },
      title: { text: 'Curva ABC / Análise de Pareto 80/20', font: { size: 14, color: '#f5f7fc' } },
      height: 420,
      margin: { l: 40, r: 45, t: 50, b: 65 },
      xaxis: { gridcolor: '#1f2740', tickfont: { size: 10 } },
      yaxis: { title: 'Valor (R$)', gridcolor: '#1f2740', tickprefix: 'R$ ' },
      yaxis2: {
        title: '% Acumulado',
        overlaying: 'y',
        side: 'right',
        range: [0, 105],
        gridcolor: 'rgba(0,0,0,0)',
        ticksuffix: '%',
      },
      shapes: [
        {
          type: 'line',
          x0: 0,
          x1: 1,
          xref: 'paper',
          y0: 80,
          y1: 80,
          yref: 'y2',
          line: { color: '#ef4444', width: 1.5, dash: 'dash' },
        },
      ],
      annotations: [
        {
          x: 1,
          xref: 'paper',
          y: 80,
          yref: 'y2',
          text: 'Corte 80%',
          showarrow: false,
          font: { color: '#ef4444', size: 10 },
          xanchor: 'right',
          yanchor: 'bottom',
        },
      ],
      legend: { orientation: 'h', y: -0.18, x: 0 },
    },
  })
}

function construirScatterRiscoRetornoJson(analise: AnaliseUpload): string {
  if (analise.projeto?.graficos?.scatter_risco_retorno) {
    return analise.projeto.graficos.scatter_risco_retorno
  }

  const pontos = analise.locais.map((l) => {
    const r = l.resumo
    const retorno = r.tempo_retorno
    let cor = '#10b981'
    if (retorno === null || retorno > 24) cor = '#ef4444'
    else if (retorno > 12) cor = '#f59e0b'

    return {
      name: l.nome,
      x: r.investimento,
      y: r.saldo_mensal,
      size: Math.max(12, Math.min(30, 10 + r.num_itens * 1.5)),
      color: cor,
      retornoTexto: retorno !== null ? `${fmtNumero(retorno)}m` : 'Inviável',
      receitaTexto: fmtMoeda(r.valor_mensal),
    }
  })

  return JSON.stringify({
    data: pontos.map((p) => ({
      x: [p.x],
      y: [p.y],
      mode: 'markers+text',
      name: p.name,
      text: [p.name],
      textposition: 'top center',
      marker: {
        size: p.size,
        color: p.color,
        line: { color: '#ffffff', width: 1.5 },
      },
      hovertemplate: `<b>${p.name}</b><br>Investimento: R$ %{x:,.2f}<br>Saldo Mensal: R$ %{y:,.2f}<br>Receita: ${p.receitaTexto}<br>Payback: ${p.retornoTexto}<extra></extra>`,
    })),
    layout: {
      template: 'plotly_white',
      paper_bgcolor: 'var(--cor-superficie)',
      plot_bgcolor: 'var(--cor-superficie)',
      font: { family: 'Inter, sans-serif', color: '#8fa3c7', size: 11 },
      title: { text: 'Matriz Scatter Risco x Retorno por Local', font: { size: 14, color: '#f5f7fc' } },
      height: 420,
      margin: { l: 50, r: 30, t: 50, b: 50 },
      xaxis: { title: 'Investimento (R$)', gridcolor: '#1f2740', tickprefix: 'R$ ' },
      yaxis: { title: 'Saldo Mensal (R$)', gridcolor: '#1f2740', tickprefix: 'R$ ' },
      showlegend: false,
    },
  })
}

function construirGaugeSaudeJson(score: number, classificacao: string): string {
  return JSON.stringify({
    data: [
      {
        type: 'indicator',
        mode: 'gauge+number',
        value: score,
        title: { text: `Gauge de Saúde (${classificacao})`, font: { size: 14, color: '#f5f7fc' } },
        number: { suffix: '/100', font: { color: '#f5f7fc', size: 28 } },
        gauge: {
          axis: { range: [0, 100], tickwidth: 1, tickcolor: '#1f2740' },
          bar: { color: score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444' },
          bgcolor: 'var(--cor-superficie)',
          borderwidth: 1,
          bordercolor: '#1f2740',
          steps: [
            { range: [0, 40], color: 'rgba(239, 68, 68, 0.15)' },
            { range: [40, 60], color: 'rgba(245, 158, 11, 0.15)' },
            { range: [60, 80], color: 'rgba(59, 130, 246, 0.15)' },
            { range: [80, 100], color: 'rgba(16, 185, 129, 0.15)' },
          ],
        },
      },
    ],
    layout: {
      paper_bgcolor: 'var(--cor-superficie)',
      font: { family: 'Inter, sans-serif', color: '#8fa3c7' },
      height: 420,
      margin: { l: 25, r: 25, t: 40, b: 25 },
    },
  })
}

function construirDonutOperacionalJson(analise: AnaliseUpload): string {
  if (analise.projeto?.graficos?.donut_custos_operacionais) {
    return analise.projeto.graficos.donut_custos_operacionais
  }

  let maoDeObra = 0
  let manutencao = 0
  let terceirizada = 0
  let chips = 0
  let softwares = 0

  for (const l of analise.locais) {
    const r = l.resumo
    maoDeObra += r.mao_de_obra || 0
    manutencao += r.custo_manutencao || 0
    terceirizada += r.mensal_terceirizada || 0
    chips += r.chip_mensal || 0
    softwares += r.custos_softwares || 0
  }

  const labels = ['Mão de Obra', 'Manutenção', 'Terceirização', 'Chips Mensais', 'Softwares']
  const values = [maoDeObra, manutencao, terceirizada, chips, softwares]
  const colors = ['#2e59f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

  return JSON.stringify({
    data: [
      {
        labels,
        values,
        type: 'pie',
        hole: 0.55,
        marker: { colors, line: { color: 'var(--cor-superficie)', width: 2 } },
        textinfo: 'percent',
        hovertemplate: '<b>%{label}</b><br>R$ %{value:,.2f}<br>(%{percent})<extra></extra>',
      },
    ],
    layout: {
      template: 'plotly_white',
      paper_bgcolor: 'var(--cor-superficie)',
      font: { family: 'Inter, sans-serif', color: '#8fa3c7', size: 11 },
      title: { text: 'Donut de Custos Operacionais', font: { size: 14, color: '#f5f7fc' } },
      height: 420,
      margin: { l: 20, r: 20, t: 50, b: 40 },
      legend: { orientation: 'h', y: -0.15, x: 0 },
    },
  })
}

function construirFluxoEmpilhadoJson(analise: AnaliseUpload): string {
  if (analise.projeto?.graficos?.fluxo_empilhado) {
    return analise.projeto.graficos.fluxo_empilhado
  }

  const meses = Array.from({ length: 36 }, (_, i) => i + 1)
  const receitaTotalMensal = analise.locais.reduce((acc, l) => acc + l.resumo.valor_mensal, 0)
  const impostosMensais = receitaTotalMensal * 0.165
  const custosOpMensais = analise.locais.reduce(
    (acc, l) => acc + l.resumo.custo_manutencao + l.resumo.mensal_terceirizada + l.resumo.chip_mensal + l.resumo.custos_softwares,
    0
  )
  const saldoLiquidoMensal = analise.locais.reduce((acc, l) => acc + l.resumo.saldo_mensal, 0)

  const impData = meses.map(() => impostosMensais)
  const custData = meses.map(() => custosOpMensais)
  const saldoData = meses.map(() => Math.max(0, saldoLiquidoMensal))

  return JSON.stringify({
    data: [
      {
        x: meses,
        y: impData,
        name: 'Impostos (16,5%)',
        type: 'bar',
        marker: { color: '#94a3b8' },
        hovertemplate: 'Mês %{x}<br>Impostos: R$ %{y:,.2f}<extra></extra>',
      },
      {
        x: meses,
        y: custData,
        name: 'Custos Operacionais',
        type: 'bar',
        marker: { color: '#f59e0b' },
        hovertemplate: 'Mês %{x}<br>Custos: R$ %{y:,.2f}<extra></extra>',
      },
      {
        x: meses,
        y: saldoData,
        name: 'Saldo Líquido',
        type: 'bar',
        marker: { color: '#10b981' },
        hovertemplate: 'Mês %{x}<br>Saldo Líquido: R$ %{y:,.2f}<extra></extra>',
      },
    ],
    layout: {
      template: 'plotly_white',
      paper_bgcolor: 'var(--cor-superficie)',
      plot_bgcolor: 'var(--cor-superficie)',
      font: { family: 'Inter, sans-serif', color: '#8fa3c7', size: 11 },
      title: { text: 'Fluxo de Caixa Empilhado 36 Meses', font: { size: 14, color: '#f5f7fc' } },
      height: 420,
      barmode: 'stack',
      margin: { l: 40, r: 20, t: 50, b: 60 },
      xaxis: { title: 'Meses', gridcolor: '#1f2740' },
      yaxis: { title: 'Composição Mensal (R$)', gridcolor: '#1f2740', tickprefix: 'R$ ' },
      legend: { orientation: 'h', y: -0.20, x: 0 },
    },
  })
}

function construirCurvaSJson(analise: AnaliseUpload): string {
  if (analise.projeto?.graficos?.curva_s) {
    return analise.projeto.graficos.curva_s
  }

  const meses = Array.from({ length: 37 }, (_, i) => i)
  const investimentoLiquidoTotal = analise.locais.reduce((acc, l) => acc + (l.resumo.investimento - l.resumo.taxa_instalacao), 0)
  const saldoMensalTotal = analise.locais.reduce((acc, l) => acc + l.resumo.saldo_mensal, 0)

  const invData = meses.map(() => investimentoLiquidoTotal)
  const resData = meses.map((m) => -investimentoLiquidoTotal + saldoMensalTotal * m)

  return JSON.stringify({
    data: [
      {
        x: meses,
        y: invData,
        mode: 'lines',
        name: 'Investimento Líquido',
        line: { color: '#ef4444', width: 2, dash: 'dash' },
        hovertemplate: 'Investimento: R$ %{y:,.2f}<extra></extra>',
      },
      {
        x: meses,
        y: resData,
        mode: 'lines+markers',
        name: 'Resultado Acumulado (Curva S)',
        line: { color: '#2e59f6', width: 3.5, shape: 'spline' },
        fill: 'tozeroy',
        fillcolor: 'rgba(46, 89, 246, 0.08)',
        marker: { size: 5, color: '#2e59f6' },
        hovertemplate: 'Mês %{x}<br>Resultado Acumulado: R$ %{y:,.2f}<extra></extra>',
      },
    ],
    layout: {
      template: 'plotly_white',
      paper_bgcolor: 'var(--cor-superficie)',
      plot_bgcolor: 'var(--cor-superficie)',
      font: { family: 'Inter, sans-serif', color: '#8fa3c7', size: 11 },
      title: { text: 'Curva S — Investimento Líquido vs Resultado Acumulado', font: { size: 14, color: '#f5f7fc' } },
      height: 420,
      margin: { l: 50, r: 20, t: 50, b: 60 },
      xaxis: { title: 'Meses', gridcolor: '#1f2740' },
      yaxis: { title: 'Valor Acumulado (R$)', gridcolor: '#1f2740', tickprefix: 'R$ ' },
      legend: { orientation: 'h', y: -0.20, x: 0 },
    },
  })
}

function construirHistogramaMonteCarloJson(resultado: ResultadoMonteCarlo): string {
  const x = resultado.histograma.map((h) => h.faixa)
  const y = resultado.histograma.map((h) => h.pct)
  const counts = resultado.histograma.map((h) => h.count)

  const colors = x.map((faixa) => {
    if (faixa === '>36m / Inviável') return '#ef4444'
    if (['25-30m', '31-36m'].includes(faixa)) return '#f59e0b'
    return '#10b981'
  })

  return JSON.stringify({
    data: [
      {
        x,
        y,
        type: 'bar',
        marker: { color: colors, line: { color: '#ffffff', width: 0.8 } },
        customdata: counts,
        hovertemplate: 'Faixa %{x}<br>Probabilidade: <b>%{y:.1f}%</b><br>Ocorrências: %{customdata} iterações<extra></extra>',
      },
    ],
    layout: {
      template: 'plotly_white',
      paper_bgcolor: 'var(--cor-superficie)',
      plot_bgcolor: 'var(--cor-superficie)',
      font: { family: 'Inter, sans-serif', color: '#8fa3c7', size: 11 },
      title: {
        text: `Histograma de Distribuição de Payback (${resultado.iteracoes.toLocaleString('pt-BR')} Iterações)`,
        font: { size: 14, color: '#f5f7fc' },
      },
      height: 360,
      margin: { l: 40, r: 20, t: 45, b: 50 },
      xaxis: { title: 'Faixas de Tempo para Payback', gridcolor: '#1f2740' },
      yaxis: { title: 'Probabilidade (%)', gridcolor: '#1f2740', ticksuffix: '%' },
      showlegend: false,
    },
  })
}

export default function AnalyticsAvancadoTab({ analise }: Props) {
  const [iteracoes, setIteracoes] = useState(1000)
  const resumos = useMemo(() => analise.locais.map((l) => l.resumo), [analise])

  const resultadoMonteCarlo = useMemo(
    () => simularMonteCarlo(resumos, iteracoes),
    [resumos, iteracoes]
  )

  const paretoJson = useMemo(() => construirParetoGlobalJson(analise), [analise])
  const scatterJson = useMemo(() => construirScatterRiscoRetornoJson(analise), [analise])
  const gaugeJson = useMemo(
    () => construirGaugeSaudeJson(resultadoMonteCarlo.scoreSaude, resultadoMonteCarlo.classificacaoSaude),
    [resultadoMonteCarlo]
  )
  const donutJson = useMemo(() => construirDonutOperacionalJson(analise), [analise])
  const fluxoEmpilhadoJson = useMemo(() => construirFluxoEmpilhadoJson(analise), [analise])
  const curvaSJson = useMemo(() => construirCurvaSJson(analise), [analise])
  const histogramaJson = useMemo(
    () => construirHistogramaMonteCarloJson(resultadoMonteCarlo),
    [resultadoMonteCarlo]
  )

  const corScore =
    resultadoMonteCarlo.scoreSaude >= 80
      ? '#10b981'
      : resultadoMonteCarlo.scoreSaude >= 60
        ? '#3b82f6'
        : resultadoMonteCarlo.scoreSaude >= 40
          ? '#f59e0b'
          : '#ef4444'

  return (
    <div className="space-y-8">
      {/* Painel do Simulador de Monte Carlo */}
      <section
        className="p-6 rounded-2xl border space-y-6"
        style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}
        aria-labelledby="monte-carlo-heading"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 id="monte-carlo-heading" className="text-[17px] font-semibold flex items-center gap-2" style={{ color: 'var(--cor-tinta)' }}>
              🎲 Simulador de Monte Carlo & Análise Probabilística
            </h2>
            <p className="text-xs text-mutado mt-1">
              Simulação estocástica em tempo real no cliente ({iteracoes.toLocaleString('pt-BR')} iterações) injetando volatilidade aleatória gaussian/triangular de receitas, custos e inadimplência.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-mutado hidden sm:inline">Iterações:</span>
            {[500, 1000, 2500, 5000].map((num) => (
              <button
                key={num}
                onClick={() => setIteracoes(num)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  iteracoes === num ? 'bg-primary/20 text-tinta border-primary' : 'text-mutado border-borda hover:bg-elevado'
                }`}
                style={
                  iteracoes === num
                    ? { background: 'rgba(46, 89, 246, 0.2)', color: 'var(--cor-tinta)', borderColor: 'var(--cor-primaria)' }
                    : { borderColor: 'var(--cor-borda)', color: 'var(--cor-mutado)' }
                }
              >
                {num.toLocaleString('pt-BR')}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs do Monte Carlo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            rotulo="Score de Saúde Financeira"
            valor={`${resultadoMonteCarlo.scoreSaude}/100`}
            sub={`Classificação: ${resultadoMonteCarlo.classificacaoSaude}`}
            cor={corScore}
            badge={resultadoMonteCarlo.classificacaoSaude}
            badgePositivo={resultadoMonteCarlo.scoreSaude >= 60}
          />
          <KpiCard
            rotulo="Probab. Payback ≤ 24m"
            valor={fmtPct(resultadoMonteCarlo.probabilidadePayback24m)}
            sub="Retorno garantido em 2 anos"
            cor="#10b981"
            atraso={60}
          />
          <KpiCard
            rotulo="Probab. Payback ≤ 36m"
            valor={fmtPct(resultadoMonteCarlo.probabilidadePayback36m)}
            sub="Retorno garantido em 3 anos"
            cor="#3b82f6"
            atraso={120}
          />
          <KpiCard
            rotulo="Payback Médio (P50)"
            valor={resultadoMonteCarlo.paybackP50 !== null ? `${resultadoMonteCarlo.paybackP50} meses` : 'Inviável'}
            sub={`P10 (Otimista): ${resultadoMonteCarlo.paybackP10 ?? '—'}m | P90: ${resultadoMonteCarlo.paybackP90 ?? '—'}m`}
            cor="#f59e0b"
            atraso={180}
          />
        </div>

        {/* Histograma de Probabilidade */}
        <div className="pt-2">
          <PlotlyChart figJson={histogramaJson} />
        </div>
      </section>

      {/* Grid com os 6 Novos Gráficos Avançados */}
      <section aria-labelledby="novos-graficos-heading" className="space-y-4">
        <h2 id="novos-graficos-heading" className="text-[17px] font-semibold" style={{ color: 'var(--cor-tinta)' }}>
          📊 Suíte de 6 Gráficos Analíticos Avançados
        </h2>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <PlotlyChart figJson={paretoJson} />
          <PlotlyChart figJson={scatterJson} />
          <PlotlyChart figJson={gaugeJson} />
          <PlotlyChart figJson={donutJson} />
          <PlotlyChart figJson={fluxoEmpilhadoJson} />
          <PlotlyChart figJson={curvaSJson} />
        </div>
      </section>
    </div>
  )
}
