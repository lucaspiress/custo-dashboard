import type { AnaliseUpload, Local } from '../../lib/types'
import { fmtData, fmtMoeda, fmtNumero } from '../../lib/format'
import { KPI_CORES } from '../../lib/theme'
import KpiCard from '../KpiCard'
import PlotlyChart from '../PlotlyChart'
import InsightCard from '../InsightCard'
import { Link, useParams } from 'react-router-dom'

interface Props {
  analise: AnaliseUpload
  local: Local
}

export default function VisaoGeralTab({ analise, local }: Props) {
  const { id } = useParams<{ id: string }>()
  const r = local.resumo
  const margem = r.margem === null || r.margem === undefined
    ? undefined
    : `Margem de ${(r.margem * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}% sobre a receita`

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard rotulo="Receita mensal" valor={fmtMoeda(r.valor_mensal)} sub="Mensalidade do contrato" cor={KPI_CORES['Receita mensal']} />
        <KpiCard rotulo="Saldo mensal" valor={fmtMoeda(r.saldo_mensal)} sub={margem} cor={KPI_CORES['Saldo mensal']} atraso={60} />
        <KpiCard rotulo="Investimento" valor={fmtMoeda(r.investimento)} sub="Mão de obra + equipamento" cor={KPI_CORES.Investimento} atraso={120} />
        <KpiCard rotulo="Tempo de retorno" valor={fmtNumero(r.tempo_retorno)} sub="Payback do investimento" cor={KPI_CORES['Tempo de retorno']} atraso={180} />
        <KpiCard rotulo="Receita anual" valor={fmtMoeda(r.receita_anual)} sub="12 meses + taxa de instalação" cor={KPI_CORES['Receita anual']} atraso={240} />
        <KpiCard rotulo="Impostos (15%)" valor={fmtMoeda(r.impostos)} sub="Sobre a receita mensal" cor={KPI_CORES['Impostos (15%)']} atraso={300} />
        <KpiCard rotulo="Equipamento" valor={fmtMoeda(r.equipamento)} sub="Itens da proposta" cor={KPI_CORES.Equipamento} atraso={360} />
        <KpiCard rotulo="Instalação" valor={fmtData(r.data_inst)} sub="Data prevista / realizada" cor={KPI_CORES['Instalação']} atraso={420} />
      </div>

      <div className="mt-10">
        <div className="text-[15px] font-semibold my-1.5 mb-2.5" style={{ color: 'var(--cor-tinta)' }}>Resumo do local</div>
        <div
          className="overflow-x-auto rounded-2xl border"
          style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)', animation: 'fadeInUp 0.5s ease-out 600ms both' }}
        >
          <table className="w-full text-[13px]"><caption className="sr-only">Resumo financeiro por local</caption>
            <thead>
              <tr className="text-left font-semibold border-b" style={{ color: 'var(--cor-tinta)', borderColor: 'var(--cor-borda)' }}>
                <th scope="col" className="px-3 py-2.5">Local</th>
                <th scope="col" className="px-3 py-2.5">Receita mensal (R$)</th>
                <th scope="col" className="px-3 py-2.5">Saldo mensal (R$)</th>
                <th scope="col" className="px-3 py-2.5">Mão de obra (R$)</th>
                <th scope="col" className="px-3 py-2.5">Equipamento (R$)</th>
                <th scope="col" className="px-3 py-2.5">Investimento (R$)</th>
                <th scope="col" className="px-3 py-2.5">Retorno (meses)</th>
                <th scope="col" className="px-3 py-2.5">Itens</th>
              </tr>
            </thead>
            <tbody>
              {analise.locais.map((l) => (
                <tr key={l.nome} className="border-b last:border-0 font-mono hover:bg-[var(--cor-hover)] transition-colors" style={{ borderColor: 'var(--cor-borda)' }}>
                  <td className="px-3 py-2 font-sans" style={{ color: 'var(--cor-tinta)' }}>{l.nome}</td>
                  <td className="px-3 py-2">{fmtMoeda(l.resumo.valor_mensal)}</td>
                  <td className="px-3 py-2">{fmtMoeda(l.resumo.saldo_mensal)}</td>
                  <td className="px-3 py-2">{fmtMoeda(l.resumo.mao_de_obra)}</td>
                  <td className="px-3 py-2">{fmtMoeda(l.resumo.equipamento)}</td>
                  <td className="px-3 py-2">{fmtMoeda(l.resumo.investimento)}</td>
                  <td className="px-3 py-2">{fmtNumero(l.resumo.tempo_retorno)}</td>
                  <td className="px-3 py-2">{l.resumo.num_itens}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <section className="mt-10" aria-labelledby="visao-graficos">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><h2 id="visao-graficos" className="text-[15px] font-semibold">Leitura rápida</h2><p className="mt-1 text-xs text-mutado">Gráficos gerados a partir do payload da análise.</p></div>
          <Link to={id ? `/projetos/${id}/custos` : '#'} className="text-xs font-semibold text-ciano hover:underline">Ver composição detalhada</Link>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {local.graficos.composicao && <PlotlyChart figJson={local.graficos.composicao} />}
          {analise.projeto.graficos.saldo && <PlotlyChart figJson={analise.projeto.graficos.saldo} />}
        </div>
      </section>

      {analise.projeto.graficos.curva_s && (
        <section className="mt-10" aria-labelledby="visao-curva-s">
          <div className="mb-3">
            <h2 id="visao-curva-s" className="text-[15px] font-semibold" style={{ color: 'var(--cor-tinta)' }}>Curva S — Investimentos vs Resultado Acumulado</h2>
            <p className="mt-1 text-xs text-mutado">Evolução dos desembolsos e fluxo de caixa ao longo dos 36 meses.</p>
          </div>
          <PlotlyChart figJson={analise.projeto.graficos.curva_s} />
        </section>
      )}


      <section className="mt-10" aria-labelledby="visao-insights">
        <div className="mb-3 flex items-center justify-between gap-3"><h2 id="visao-insights" className="text-[15px] font-semibold">Insights deste local</h2><Link to={id ? `/projetos/${id}/insights` : '#'} className="text-xs font-semibold text-ciano hover:underline">Abrir insights</Link></div>
        {local.insights.length > 0 ? local.insights.map((insight, indice) => <InsightCard key={indice} {...insight} atraso={indice * 60} />) : <p className="rounded-xl border p-4 text-sm text-mutado" style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-superficie)' }}>Não há evidência suficiente para gerar insights para este local.</p>}
      </section>
    </div>
  )
}
