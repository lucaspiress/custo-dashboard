import type { WidgetConfig } from '../../lib/types'
import { fmtNum } from './chartUtils'

interface Props {
  data: any
  config?: WidgetConfig
}

interface LinhaPivot {
  rotulo: string
  valores: Record<string, number>
}

function normalizarLinhas(linhas: any[]): LinhaPivot[] {
  return linhas.map((l) => {
    if (l && typeof l === 'object' && 'chave' in l && 'valores' in l) {
      return { rotulo: String(l.chave), valores: l.valores ?? {} }
    }
    const valores: Record<string, number> = {}
    let rotulo = ''
    for (const [k, v] of Object.entries(l ?? {})) {
      if (k === 'rotulo' || k === 'chave' || k === 'label') {
        rotulo = String(v)
      } else {
        valores[k] = Number(v) || 0
      }
    }
    return { rotulo: rotulo || String(l?.rotulo ?? l?.chave ?? ''), valores }
  })
}

export default function PivotWidget({ data }: Props) {
  const colunas: string[] = Array.isArray(data?.colunas) ? data.colunas.map(String) : []
  const linhas = normalizarLinhas(Array.isArray(data?.linhas) ? data.linhas : [])

  if (linhas.length === 0 || colunas.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[12.5px]" style={{ color: 'var(--cor-mutado)' }}>
        Sem dados
      </div>
    )
  }

  const totaisColuna = colunas.map((c) => linhas.reduce((soma, l) => soma + (l.valores[c] ?? 0), 0))
  const totalGeral = totaisColuna.reduce((s, v) => s + v, 0)

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-left text-[12.5px]">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--cor-borda)' }}>
            <th className="px-2 py-1.5 font-semibold whitespace-nowrap" style={{ color: 'var(--cor-mutado)' }}>Linha</th>
            {colunas.map((c) => (
              <th key={c} className="px-2 py-1.5 font-semibold whitespace-nowrap text-right" style={{ color: 'var(--cor-mutado)' }}>
                {c}
              </th>
            ))}
            <th className="px-2 py-1.5 font-semibold whitespace-nowrap text-right" style={{ color: 'var(--cor-mutado)' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => {
            const totalLinha = colunas.reduce((soma, c) => soma + (l.valores[c] ?? 0), 0)
            return (
              <tr key={i} className="border-b" style={{ borderColor: 'var(--cor-borda)' }}>
                <td className="px-2 py-1.5 font-medium whitespace-nowrap" style={{ color: 'var(--cor-tinta)' }}>{l.rotulo}</td>
                {colunas.map((c) => (
                  <td key={c} className="px-2 py-1.5 text-right tabular-nums" style={{ color: 'var(--cor-tinta)' }}>
                    {fmtNum(l.valores[c])}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right tabular-nums font-semibold" style={{ color: 'var(--cor-primaria)' }}>
                  {fmtNum(totalLinha)}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className="px-2 py-1.5 font-semibold" style={{ color: 'var(--cor-mutado)' }}>Total</td>
            {totaisColuna.map((t, i) => (
              <td key={i} className="px-2 py-1.5 text-right tabular-nums font-semibold" style={{ color: 'var(--cor-mutado)' }}>
                {fmtNum(t)}
              </td>
            ))}
            <td className="px-2 py-1.5 text-right tabular-nums font-semibold" style={{ color: 'var(--cor-primaria)' }}>
              {fmtNum(totalGeral)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
