import type { Local } from '../../lib/types'
import InsightCard from '../InsightCard'

interface Props {
  local: Local
}

export default function InsightsTab({ local }: Props) {
  if (local.insights.length === 0) {
    return <div className="text-sm text-mutado">Nenhum insight gerado para este local.</div>
  }
  return (
    <div>
      {local.insights.map((insight, indice) => (
        <InsightCard key={indice} severidade={insight.severidade} texto={insight.texto} atraso={indice * 60} />
      ))}
    </div>
  )
}
