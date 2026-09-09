import { useMemo } from 'react'
import type { AnaliseUpload } from '../../lib/types'
import { fmtMoeda, fmtNumero } from '../../lib/format'
import { calcularDRE, gerarMatrizSensibilidade } from '../../lib/dre'

interface Props {
  analise: AnaliseUpload
}

export default function DreSensibilidadeTab({ analise }: Props) {
  const dre = useMemo(() => calcularDRE(analise), [analise])
  const matriz = useMemo(() => gerarMatrizSensibilidade(analise), [analise])

  return (
    <div className="space-y-10">
      {/* Tabela DRE */}
      <div
        className="p-6 rounded-2xl border space-y-4"
        style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}
      >
        <div>
          <h2 className="text-[16px] font-semibold" style={{ color: 'var(--cor-tinta)' }}>
            📊 DRE Projetado — Demonstração do Resultado do Exercício
          </h2>
          <p className="text-xs text-mutado mt-1">
            Resumo estruturado de receita, tributação (16,5%) e margem de contribuição operacional.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] text-left">
            <thead>
              <tr className="border-b font-semibold" style={{ color: 'var(--cor-tinta)', borderColor: 'var(--cor-borda)' }}>
                <th className="py-2.5 px-3">Descrição da Conta</th>
                <th className="py-2.5 px-3 text-right">Valor Mensal (R$)</th>
                <th className="py-2.5 px-3 text-right">Valor Anual (R$)</th>
                <th className="py-2.5 px-3 text-right">% s/ Receita</th>
              </tr>
            </thead>
            <tbody className="divide-y font-mono tabular-nums" style={{ borderColor: 'var(--cor-borda)' }}>
              {dre.linhas.map((linha, idx) => (
                <tr
                  key={idx}
                  className={linha.destaque ? 'font-semibold bg-slate-800/40' : 'hover:bg-[var(--cor-hover)]'}
                  style={{ color: linha.destaque ? 'var(--cor-tinta)' : 'var(--cor-texto)' }}
                >
                  <td className="py-2.5 px-3 font-sans">{linha.descricao}</td>
                  <td className="py-2.5 px-3 text-right">{fmtMoeda(linha.valorMensal)}</td>
                  <td className="py-2.5 px-3 text-right">{fmtMoeda(linha.valorAnual)}</td>
                  <td className="py-2.5 px-3 text-right">{fmtNumero(linha.percentualReceita)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matriz de Sensibilidade 5x5 */}
      <div
        className="p-6 rounded-2xl border space-y-4"
        style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}
      >
        <div>
          <h2 className="text-[16px] font-semibold" style={{ color: 'var(--cor-tinta)' }}>
            🎯 Matriz de Sensibilidade de Payback (5x5)
          </h2>
          <p className="text-xs text-mutado mt-1">
            Tempo estimado de retorno (em meses) cruzando variações de Mensalidades vs Custos de Instalação.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px] text-center border-collapse">
            <thead>
              <tr className="border-b text-xs font-semibold" style={{ color: 'var(--cor-tinta)', borderColor: 'var(--cor-borda)' }}>
                <th className="p-3 text-left">Mensalidade \ Instalação</th>
                <th className="p-3">-10% Instalação</th>
                <th className="p-3">-5% Instalação</th>
                <th className="p-3 font-bold text-cyan-400">0% (Base)</th>
                <th className="p-3">+5% Instalação</th>
                <th className="p-3">+10% Instalação</th>
              </tr>
            </thead>
            <tbody className="divide-y font-mono tabular-nums" style={{ borderColor: 'var(--cor-borda)' }}>
              {matriz.map((linha, i) => {
                const vm = linha[0].varMensalPct
                return (
                  <tr key={i} className="hover:bg-[var(--cor-hover)]">
                    <td className="p-3 text-left font-sans font-semibold" style={{ color: 'var(--cor-tinta)' }}>
                      {vm > 0 ? `+${vm}% Mensalidade` : `${vm}% Mensalidade`}
                    </td>
                    {linha.map((ponto, j) => {
                      const pb = ponto.paybackMeses
                      let corBg = 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                      if (!pb || pb > 36) corBg = 'bg-rose-950/40 text-rose-400 border-rose-800/40'
                      else if (pb > 24) corBg = 'bg-amber-950/40 text-amber-400 border-amber-800/40'

                      return (
                        <td key={j} className="p-2">
                          <div className={`p-2 rounded-xl border text-xs font-bold ${corBg}`}>
                            {pb ? `${pb} meses` : 'Inviável'}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
