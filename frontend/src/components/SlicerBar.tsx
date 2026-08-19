import type { Slicer } from '../lib/types'

interface Props {
  slicers: Slicer[]
  opcoes: Record<number, any[]>
  valores: Record<number, any>
  onChange: (slicerId: number, values: any) => void
}

const ROTULO_TIPO: Record<string, string> = {
  lista: 'Lista',
  intervalo: 'Intervalo',
  data: 'Data',
}

export default function SlicerBar({ slicers, opcoes, valores, onChange }: Props) {
  if (slicers.length === 0) return null

  return (
    <div
      className="rounded-2xl border p-3 mb-4 flex flex-wrap items-start gap-3"
      style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wider pt-1.5" style={{ color: 'var(--cor-mutado)' }}>
        Filtros
      </span>
      {slicers.map((s) => (
        <div key={s.id} className="min-w-[160px]">
          <div className="text-[11px] mb-1 font-medium" style={{ color: 'var(--cor-mutado)' }}>
            {s.field} <span className="opacity-60">· {ROTULO_TIPO[s.tipo] ?? s.tipo}</span>
          </div>
          {s.tipo === 'lista' && (
            <div className="flex flex-wrap gap-1.5 max-w-[320px]">
              {(opcoes[s.id] ?? []).map((opcao) => {
                const selecionado = Array.isArray(valores[s.id]) && valores[s.id].includes(opcao)
                return (
                  <button
                    key={String(opcao)}
                    onClick={() => {
                      const atual = Array.isArray(valores[s.id]) ? valores[s.id] : []
                      const novo = selecionado
                        ? atual.filter((v: any) => v !== opcao)
                        : [...atual, opcao]
                      onChange(s.id, novo)
                    }}
                    className="h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors"
                    style={
                      selecionado
                        ? { background: 'rgba(46, 89, 246, 0.25)', color: 'var(--cor-tinta)', border: '1px solid rgba(46, 89, 246, 0.5)' }
                        : { background: 'var(--cor-elevado)', color: 'var(--cor-mutado)', border: '1px solid var(--cor-borda)' }
                    }
                  >
                    {String(opcao)}
                  </button>
                )
              })}
              {(opcoes[s.id] ?? []).length === 0 && (
                <span className="text-[12px]" style={{ color: 'var(--cor-mutado)' }}>Sem opções</span>
              )}
            </div>
          )}
          {s.tipo === 'intervalo' && (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                placeholder="min"
                value={Array.isArray(valores[s.id]) ? valores[s.id][0] ?? '' : ''}
                onChange={(e) => onChange(s.id, [e.target.value, Array.isArray(valores[s.id]) ? valores[s.id][1] ?? '' : ''])}
                className="w-20 rounded-md px-2 py-1.5 text-[12px] border outline-none"
                style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-elevado)', color: 'var(--cor-tinta)' }}
              />
              <span style={{ color: 'var(--cor-mutado)' }}>–</span>
              <input
                type="number"
                placeholder="max"
                value={Array.isArray(valores[s.id]) ? valores[s.id][1] ?? '' : ''}
                onChange={(e) => onChange(s.id, [Array.isArray(valores[s.id]) ? valores[s.id][0] ?? '' : '', e.target.value])}
                className="w-20 rounded-md px-2 py-1.5 text-[12px] border outline-none"
                style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-elevado)', color: 'var(--cor-tinta)' }}
              />
            </div>
          )}
          {s.tipo === 'data' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={Array.isArray(valores[s.id]) ? valores[s.id][0] ?? '' : ''}
                onChange={(e) => onChange(s.id, [e.target.value, Array.isArray(valores[s.id]) ? valores[s.id][1] ?? '' : ''])}
                className="rounded-md px-2 py-1.5 text-[12px] border outline-none"
                style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-elevado)', color: 'var(--cor-tinta)' }}
              />
              <span style={{ color: 'var(--cor-mutado)' }}>–</span>
              <input
                type="date"
                value={Array.isArray(valores[s.id]) ? valores[s.id][1] ?? '' : ''}
                onChange={(e) => onChange(s.id, [Array.isArray(valores[s.id]) ? valores[s.id][0] ?? '' : '', e.target.value])}
                className="rounded-md px-2 py-1.5 text-[12px] border outline-none"
                style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-elevado)', color: 'var(--cor-tinta)' }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
