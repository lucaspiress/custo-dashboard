import type { ProjetoSummary } from '../../lib/types'
import { fmtMoeda, fmtNumero } from '../../lib/format'
import KpiCard from '../KpiCard'
import PlotlyChart from '../PlotlyChart'

interface Props {
  projeto: ProjetoSummary
}

export default function ComparativoTab({ projeto }: Props) {
  const t = projeto.totais
  const retornoMedio = projeto.locais
    .filter((l) => l.tempo_retorno !== null && l.tempo_retorno !== undefined)
    .reduce((soma, l) => soma + (l.tempo_retorno as number), 0)
  const retornoMedioFinal = projeto.locais.some((l) => l.tempo_retorno !== null)
    ? retornoMedio / projeto.locais.filter((l) => l.tempo_retorno !== null).length
    : null

  return (
    <div>
      <div className="grid grid-cols-4 gap-6 mb-6">
        <KpiCard rotulo="Locais" valor={String(t.num_locais)} sub={`${t.num_itens} itens no total`} cor="#2090b0" />
        <KpiCard rotulo="Receita mensal" valor={fmtMoeda(t.receita_mensal)} sub="Somada dos locais" cor="#6ba3d7" atraso={60} />
        <KpiCard rotulo="Saldo mensal" valor={fmtMoeda(t.saldo_mensal)} sub="Somada dos locais" cor="#10b981" atraso={120} />
        <KpiCard rotulo="Investimento" valor={fmtMoeda(t.investimento)} sub="Mão de obra + equipamento" cor="#e07b1a" atraso={180} />
      </div>
      <div className="grid grid-cols-4 gap-6 mb-2">
        <KpiCard rotulo="Receita anual" valor={fmtMoeda(t.receita_anual)} sub="12 meses + taxas" cor="#2090b0" atraso={240} />
        <KpiCard rotulo="Equipamento" valor={fmtMoeda(t.equipamento)} sub="Itens da proposta" cor="#10a0a0" atraso={300} />
        <KpiCard rotulo="Mão de obra" valor={fmtMoeda(t.mao_de_obra)} sub="Instalação" cor="#c98f35" atraso={360} />
        <KpiCard rotulo="Retorno médio" valor={retornoMedioFinal !== null ? fmtNumero(retornoMedioFinal) : '—'} sub="Payback médio dos locais" cor="#ef4444" atraso={420} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <PlotlyChart figJson={projeto.graficos.investimento} />
        <PlotlyChart figJson={projeto.graficos.saldo} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <PlotlyChart figJson={projeto.graficos.retorno} />
        <PlotlyChart figJson={projeto.graficos.dispersao} />
      </div>

      <div className="mt-2">
        <div className="text-[15px] font-semibold text-tinta my-1.5 mb-2.5">Ranking dos locais</div>
        <div className="overflow-x-auto rounded-xl border border-borda bg-superficie">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-tinta font-semibold border-b border-borda">
                <th className="px-3 py-2.5">Local</th>
                <th className="px-3 py-2.5">Receita mensal</th>
                <th className="px-3 py-2.5">Saldo mensal</th>
                <th className="px-3 py-2.5">Investimento</th>
                <th className="px-3 py-2.5">Retorno (meses)</th>
                <th className="px-3 py-2.5">Itens</th>
              </tr>
            </thead>
            <tbody>
              {[...projeto.locais]
                .sort((a, b) => (b.tempo_retorno ?? Infinity) - (a.tempo_retorno ?? Infinity))
                .map((l) => (
                  <tr key={l.local} className="border-b border-borda last:border-0 font-mono">
                    <td className="px-3 py-2 font-sans">{l.local}</td>
                    <td className="px-3 py-2">{fmtMoeda(l.valor_mensal)}</td>
                    <td className="px-3 py-2">{fmtMoeda(l.saldo_mensal)}</td>
                    <td className="px-3 py-2">{fmtMoeda(l.investimento)}</td>
                    <td className="px-3 py-2">{fmtNumero(l.tempo_retorno)}</td>
                    <td className="px-3 py-2">{l.num_itens}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
