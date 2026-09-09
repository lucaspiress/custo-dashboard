import { useEffect } from 'react'
import type { AnaliseUpload } from '../lib/types'
import { fmtMoeda, fmtNumero } from '../lib/format'
import PlotlyChart from './PlotlyChart'

interface Props {
  analise: AnaliseUpload
  onFechar: () => void
}

export default function ModoApresentacao({ analise, onFechar }: Props) {
  const t = analise.projeto.totais
  const primeiroLocal = analise.locais[0]

  useEffect(() => {
    const aoPressionarTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoPressionarTecla)
    return () => window.removeEventListener('keydown', aoPressionarTecla)
  }, [onFechar])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 text-slate-100 p-8 flex flex-col justify-between">
      {/* Cabeçalho Pitch Mode */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <img src="/icon-atalho.png" alt="Rota Group" className="w-10 h-10 object-contain" />
          <div>
            <span className="text-xs uppercase tracking-widest text-cyan-400 font-semibold">Proposta Comercial // Apresentação Executiva</span>
            <h1 className="text-2xl font-bold tracking-tight text-white">{analise.filename}</h1>
          </div>
        </div>

        <button
          onClick={onFechar}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 transition-colors flex items-center gap-2"
        >
          <span>✕ Sair da Apresentação</span>
          <span className="text-[10px] text-slate-400 font-mono">(Esc)</span>
        </button>
      </div>

      {/* Grade de KPIs em Destaque */}
      <div className="my-8 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs font-medium text-slate-400">Receita Mensal Contratada</span>
          <div className="text-3xl font-bold font-mono tabular-nums text-emerald-400">{fmtMoeda(t.receita_mensal)}</div>
        </div>
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs font-medium text-slate-400">Saldo mensal acumulado</span>
          <div className="text-3xl font-bold font-mono tabular-nums text-cyan-400">{fmtMoeda(t.saldo_mensal)}</div>
        </div>
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs font-medium text-slate-400">Investimento Total</span>
          <div className="text-3xl font-bold font-mono tabular-nums text-amber-400">{fmtMoeda(t.investimento)}</div>
        </div>
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs font-medium text-slate-400">Unidades / Locais Atendidos</span>
          <div className="text-3xl font-bold font-mono tabular-nums text-indigo-400">{fmtNumero(t.num_locais)} unidades</div>
        </div>
      </div>

      {/* Visualização de Gráficos e Curva S */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-4">
        {analise.projeto.graficos.curva_s && (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <h3 className="text-sm font-semibold text-slate-200">Curva S — Investimentos vs Resultado Acumulado</h3>
            <PlotlyChart figJson={analise.projeto.graficos.curva_s} />
          </div>
        )}
        {primeiroLocal?.graficos.composicao && (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <h3 className="text-sm font-semibold text-slate-200">Composição do Investimento</h3>
            <PlotlyChart figJson={primeiroLocal.graficos.composicao} />
          </div>
        )}
      </div>

      {/* Rodapé Pitch Deck */}
      <div className="border-t border-slate-800 pt-6 flex items-center justify-between text-xs text-slate-500">
        <span>Rota Group © 2026 — Inteligência Financeira e Engenharia de Custos</span>
        <span>Apresentação Comercial Confidencial</span>
      </div>
    </div>
  )
}
