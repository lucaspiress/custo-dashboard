import type { AnaliseUpload, Local } from '../../lib/types'
import { fmtData, fmtMoeda, fmtNumero } from '../../lib/format'
import { KPI_CORES } from '../../lib/theme'
import KpiCard from '../KpiCard'

interface Props {
  analise: AnaliseUpload
  local: Local
}

export default function VisaoGeralTab({ analise, local }: Props) {
  const r = local.resumo
  const margem = r.margem === null || r.margem === undefined
    ? undefined
    : `Margem de ${(r.margem * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}% sobre a receita`

  return (
    <div>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <KpiCard rotulo="Receita mensal" valor={fmtMoeda(r.valor_mensal)} sub="Mensalidade do contrato" cor={KPI_CORES['Receita mensal']} />
          <KpiCard rotulo="Receita anual" valor={fmtMoeda(r.receita_anual)} sub="12 meses + taxa de instalação" cor={KPI_CORES['Receita anual']} atraso={60} />
        </div>
        <div>
          <KpiCard rotulo="Saldo mensal" valor={fmtMoeda(r.saldo_mensal)} sub={margem} cor={KPI_CORES['Saldo mensal']} atraso={120} />
          <KpiCard rotulo="Impostos (15%)" valor={fmtMoeda(r.impostos)} sub="Sobre a receita mensal" cor={KPI_CORES['Impostos (15%)']} atraso={180} />
        </div>
        <div>
          <KpiCard rotulo="Investimento" valor={fmtMoeda(r.investimento)} sub="Mão de obra + equipamento" cor={KPI_CORES.Investimento} atraso={240} />
          <KpiCard rotulo="Equipamento" valor={fmtMoeda(r.equipamento)} sub="Itens da proposta" cor={KPI_CORES.Equipamento} atraso={300} />
        </div>
        <div>
          <KpiCard rotulo="Tempo de retorno" valor={fmtNumero(r.tempo_retorno)} sub="Payback do investimento" cor={KPI_CORES['Tempo de retorno']} atraso={360} />
          <KpiCard rotulo="Instalação" valor={fmtData(r.data_inst)} sub="Data prevista / realizada" cor={KPI_CORES['Instalação']} atraso={420} />
        </div>
      </div>

      <div className="mt-2">
        <div className="text-[15px] font-semibold text-tinta my-1.5 mb-2.5">Resumo do local</div>
        <div className="overflow-x-auto rounded-xl border border-borda bg-superficie">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-tinta font-semibold border-b border-borda">
                <th className="px-3 py-2.5">Local</th>
                <th className="px-3 py-2.5">Receita mensal</th>
                <th className="px-3 py-2.5">Saldo mensal</th>
                <th className="px-3 py-2.5">Mão de obra</th>
                <th className="px-3 py-2.5">Equipamento</th>
                <th className="px-3 py-2.5">Investimento</th>
                <th className="px-3 py-2.5">Retorno (meses)</th>
                <th className="px-3 py-2.5">Itens</th>
              </tr>
            </thead>
            <tbody>
              {analise.locais.map((l) => (
                <tr key={l.nome} className="border-b border-borda last:border-0 font-mono">
                  <td className="px-3 py-2 font-sans">{l.nome}</td>
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
    </div>
  )
}
