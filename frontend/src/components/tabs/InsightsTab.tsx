import type { Local } from '../../lib/types'
import InsightCard from '../InsightCard'

interface Props {
  local: Local
}

export default function InsightsTab({ local }: Props) {
  if (local.insights.length === 0) {
    return <div role="status" className="rounded-xl border p-5 text-sm text-mutado" style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>Não há evidência suficiente para gerar insights para este local.</div>
  }
  return (
    <section aria-labelledby="titulo-insights">
      <h2 id="titulo-insights" className="text-[15px] font-semibold mb-3" style={{ color: 'var(--cor-tinta)' }}>Pontos de atenção</h2>
      {local.insights.map((insight, indice) => (
        <InsightCard key={indice} severidade={insight.severidade} texto={insight.texto} atraso={indice * 60} />
      ))}
    </section>
  )
}
