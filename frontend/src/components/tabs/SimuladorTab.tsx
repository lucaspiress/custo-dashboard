import { useState, useMemo } from 'react'
import type { AnaliseUpload } from '../../lib/types'
import { fmtMoeda, fmtNumero } from '../../lib/format'
import { simularCenario } from '../../lib/simulator'
import type { ResultadoSimulacao } from '../../lib/simulator'
import KpiCard from '../KpiCard'
import { KPI_CORES } from '../../lib/theme'


interface Props {
  analise: AnaliseUpload
}

export default function SimuladorTab({ analise }: Props) {
  const resumos = useMemo(() => analise.projeto.locais, [analise])

  const [varMensal, setVarMensal] = useState<number>(0)
  const [varInstalacao, setVarInstalacao] = useState<number>(0)

  const cenarioBase = useMemo(
    () => simularCenario(resumos, 'Cenário Base (0%)', 0, 0),
    [resumos]
  )

  const cenarioSimulado: ResultadoSimulacao = useMemo(
    () => simularCenario(resumos, 'Cenário Simulado', varMensal, varInstalacao),
    [resumos, varMensal, varInstalacao]
  )

  return (
    <div className="space-y-8">
      {/* Controles de Simulação */}
      <div
        className="p-6 rounded-2xl border space-y-6"
        style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}
      >
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--cor-borda)' }}>
          <div>
            <h2 className="text-[16px] font-semibold" style={{ color: 'var(--cor-tinta)' }}>
              ⚡ Simulador de Cenários em Tempo Real
            </h2>
            <p className="text-xs text-mutado mt-0.5">
              Ajuste os controles deslizantes para simular variações de mensalidades e custos de instalação.
            </p>
          </div>
          <button
            onClick={() => {
              setVarMensal(0)
              setVarInstalacao(0)
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border hover:bg-[var(--cor-hover)] transition-colors"
            style={{ borderColor: 'var(--cor-borda)', color: 'var(--cor-tinta)' }}
          >
            Resetar Simulação
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Sliders */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Variação de Mensalidades (Reajuste):</span>
                <span className={varMensal >= 0 ? 'text-emerald-500 font-mono' : 'text-rose-500 font-mono'}>
                  {varMensal > 0 ? `+${varMensal}%` : `${varMensal}%`}
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="50"
                step="1"
                value={varMensal}
                onChange={(e) => setVarMensal(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-700"
              />
              <div className="flex justify-between text-[10px] text-mutado mt-1">
                <span>-30%</span>
                <span>0% (Base)</span>
                <span>+50%</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Variação de Custos de Instalação/Equipamento:</span>
                <span className={varInstalacao <= 0 ? 'text-emerald-500 font-mono' : 'text-rose-500 font-mono'}>
                  {varInstalacao > 0 ? `+${varInstalacao}%` : `${varInstalacao}%`}
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="50"
                step="1"
                value={varInstalacao}
                onChange={(e) => setVarInstalacao(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-700"
              />
              <div className="flex justify-between text-[10px] text-mutado mt-1">
                <span>-30%</span>
                <span>0% (Base)</span>
                <span>+50%</span>
              </div>
            </div>
          </div>

          {/* Cards Comparativos Rápidos */}
          <div className="grid grid-cols-2 gap-4">
            <KpiCard
              rotulo="Novo Saldo Mensal"
              valor={fmtMoeda(cenarioSimulado.saldoMensalTotal)}
              sub={`Base: ${fmtMoeda(cenarioBase.saldoMensalTotal)}`}
              cor={KPI_CORES['Saldo mensal']}
            />
            <KpiCard
              rotulo="Novo Payback"
              valor={fmtNumero(cenarioSimulado.paybackMesesEstimado)}
              sub={`Base: ${fmtNumero(cenarioBase.paybackMesesEstimado)} meses`}
              cor={KPI_CORES['Tempo de retorno']}
            />
          </div>
        </div>
      </div>

      {/* Tabela Comparativa de Cenários */}
      <div
        className="p-6 rounded-2xl border space-y-4"
        style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}
      >
        <h3 className="text-[15px] font-semibold" style={{ color: 'var(--cor-tinta)' }}>
          📊 Comparação de Cenários (Base vs Simulado)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] text-left">
            <thead>
              <tr className="border-b font-semibold" style={{ color: 'var(--cor-tinta)', borderColor: 'var(--cor-borda)' }}>
                <th className="py-2.5 px-3">Métrica</th>
                <th className="py-2.5 px-3">Cenário Base (Atual)</th>
                <th className="py-2.5 px-3">Cenário Simulado</th>
                <th className="py-2.5 px-3">Diferença / Variação</th>
              </tr>
            </thead>
            <tbody className="divide-y font-mono" style={{ borderColor: 'var(--cor-borda)' }}>
              <tr>
                <td className="py-2.5 px-3 font-sans font-medium" style={{ color: 'var(--cor-tinta)' }}>Receita Mensal Total</td>
                <td className="py-2.5 px-3">{fmtMoeda(cenarioBase.receitaMensalTotal)}</td>
                <td className="py-2.5 px-3">{fmtMoeda(cenarioSimulado.receitaMensalTotal)}</td>
                <td className="py-2.5 px-3 font-semibold text-emerald-500">
                  {fmtMoeda(cenarioSimulado.receitaMensalTotal - cenarioBase.receitaMensalTotal)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-medium" style={{ color: 'var(--cor-tinta)' }}>Saldo Mensal Líquido</td>
                <td className="py-2.5 px-3">{fmtMoeda(cenarioBase.saldoMensalTotal)}</td>
                <td className="py-2.5 px-3">{fmtMoeda(cenarioSimulado.saldoMensalTotal)}</td>
                <td className="py-2.5 px-3 font-semibold text-emerald-500">
                  {fmtMoeda(cenarioSimulado.saldoMensalTotal - cenarioBase.saldoMensalTotal)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-medium" style={{ color: 'var(--cor-tinta)' }}>Investimento Inicial</td>
                <td className="py-2.5 px-3">{fmtMoeda(cenarioBase.investimentoTotal)}</td>
                <td className="py-2.5 px-3">{fmtMoeda(cenarioSimulado.investimentoTotal)}</td>
                <td className="py-2.5 px-3 font-semibold text-amber-500">
                  {fmtMoeda(cenarioSimulado.investimentoTotal - cenarioBase.investimentoTotal)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-medium" style={{ color: 'var(--cor-tinta)' }}>Payback Estimado</td>
                <td className="py-2.5 px-3">{fmtNumero(cenarioBase.paybackMesesEstimado)} meses</td>
                <td className="py-2.5 px-3">{fmtNumero(cenarioSimulado.paybackMesesEstimado)} meses</td>
                <td className="py-2.5 px-3 font-semibold text-cyan-400">
                  {(cenarioSimulado.paybackMesesEstimado ?? 0) - (cenarioBase.paybackMesesEstimado ?? 0)} meses
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
