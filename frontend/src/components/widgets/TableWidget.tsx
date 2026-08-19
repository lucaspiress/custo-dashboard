import type { WidgetConfig } from '../../lib/types'
import { fmtNum } from './chartUtils'

interface Props {
  data: any
  config?: WidgetConfig
}

export default function TableWidget({ data, config }: Props) {
  const colunas = Array.isArray(config?.colunas) && config.colunas.length > 0 ? config.colunas : []
  const linhas: Record<string, any>[] = Array.isArray(data?.linhas)
    ? data.linhas
    : Array.isArray(data?.rows)
      ? data.rows
      : []

  if (linhas.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[12.5px]" style={{ color: 'var(--cor-mutado)' }}>
        Sem dados
      </div>
    )
  }

  // se não há colunas configuradas, deriva das chaves da primeira linha
  const colunasEfetivas = colunas.length > 0 ? colunas : Object.keys(linhas[0] ?? {})

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-left text-[12.5px]">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--cor-borda)' }}>
            {colunasEfetivas.map((c) => (
              <th key={c} className="px-2 py-1.5 font-semibold whitespace-nowrap" style={{ color: 'var(--cor-mutado)' }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={i} className="border-b" style={{ borderColor: 'var(--cor-borda)' }}>
              {colunasEfetivas.map((c) => (
                <td key={c} className="px-2 py-1.5 whitespace-nowrap tabular-nums" style={{ color: 'var(--cor-tinta)' }}>
                  {fmtNum(linha?.[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
