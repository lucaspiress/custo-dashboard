import { useState } from 'react'
import type { Local } from '../../lib/types'
import { fmtMoeda } from '../../lib/format'
import PlotlyChart from '../PlotlyChart'

interface Props {
  local: Local
}

const HORIZONTES = [6, 12, 24, 36]

export default function PaybackTab({ local }: Props) {
  const [meses, setMeses] = useState(12)
  const fluxo = local.fluxo[String(meses)]

  return (
    <div>
      {local.graficos.payback && <PlotlyChart figJson={local.graficos.payback} />}

      <div className="mt-4">
        <div className="text-[15px] font-semibold my-1.5 mb-2.5" style={{ color: 'var(--cor-tinta)' }}>Fluxo de caixa projetado</div>
        <div className="flex gap-2 mb-3">
          {HORIZONTES.map((h) => (
            <button
              key={h}
              onClick={() => setMeses(h)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${meses === h ? 'botao-marca border-transparent text-white' : ''}`}
              style={meses === h ? undefined : { background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)', color: 'var(--cor-mutado)' }}
            >
              {h} meses
            </button>
          ))}
        </div>
        {fluxo && (
          <>
            <PlotlyChart figJson={fluxo.grafico} />
            <div className="mt-3 overflow-x-auto rounded-2xl border" style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left font-semibold border-b" style={{ color: 'var(--cor-tinta)', borderColor: 'var(--cor-borda)' }}>
                    <th className="px-3 py-2.5">Mês</th>
                    <th className="px-3 py-2.5">Receita</th>
                    <th className="px-3 py-2.5">Impostos</th>
                    <th className="px-3 py-2.5">Custos fixos</th>
                    <th className="px-3 py-2.5">Saldo</th>
                    <th className="px-3 py-2.5">Acumulado</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {fluxo.pontos.map((p) => (
                    <tr key={p.mes} className="border-b last:border-0 font-mono" style={{ borderColor: 'var(--cor-borda)' }}>
                      <td className="px-3 py-2">{p.mes}</td>
                      <td className="px-3 py-2">{fmtMoeda(p.receita)}</td>
                      <td className="px-3 py-2">{fmtMoeda(p.impostos)}</td>
                      <td className="px-3 py-2">{fmtMoeda(p.custos_fixos)}</td>
                      <td className="px-3 py-2">{fmtMoeda(p.saldo)}</td>
                      <td className="px-3 py-2 font-semibold" style={{ color: 'var(--cor-tinta)' }}>{fmtMoeda(p.acumulado)}</td>
                      <td className="px-3 py-2">
                        {p.payback && (
                          <span className="text-[10.5px] font-bold uppercase tracking-wide text-white bg-sucesso rounded-full px-2 py-0.5">
                            Payback
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
