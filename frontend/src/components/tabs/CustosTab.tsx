import { useMemo, useState } from 'react'
import type { Local } from '../../lib/types'
import { fmtMoeda } from '../../lib/format'
import PlotlyChart from '../PlotlyChart'

interface Props {
  local: Local
  categorias: string[]
  onCategorias: (categorias: string[]) => void
}

const ORDENACOES = [
  { valor: 'desc', rotulo: 'Valor total (maior primeiro)' },
  { valor: 'asc', rotulo: 'Valor total (menor primeiro)' },
  { valor: 'categoria', rotulo: 'Categoria' },
  { valor: 'material', rotulo: 'Material (A–Z)' },
] as const

export default function CustosTab({ local, categorias }: Props) {
  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState<string>('desc')

  const itens = useMemo(() => {
    let lista = [...local.itens]
    if (busca.trim()) {
      const termo = busca.trim().toLowerCase()
      lista = lista.filter(
        (i) => i.material.toLowerCase().includes(termo) || i.cod.toLowerCase().includes(termo),
      )
    }
    if (categorias.length > 0) {
      lista = lista.filter((i) => categorias.includes(i.categoria))
    }
    switch (ordenacao) {
      case 'asc':
        return lista.sort((a, b) => a.valor_total - b.valor_total)
      case 'categoria':
        return lista.sort((a, b) => a.categoria.localeCompare(b.categoria) || b.valor_total - a.valor_total)
      case 'material':
        return lista.sort((a, b) => a.material.localeCompare(b.material))
      default:
        return lista.sort((a, b) => b.valor_total - a.valor_total)
    }
  }, [local, busca, categorias, ordenacao])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {local.graficos.composicao && <PlotlyChart figJson={local.graficos.composicao} />}
        {local.graficos.categorias && <PlotlyChart figJson={local.graficos.categorias} />}
      </div>
      {local.graficos.pareto && <PlotlyChart figJson={local.graficos.pareto} />}

      <div className="mt-2">
        <div className="text-[15px] font-semibold my-1.5 mb-2.5" style={{ color: 'var(--cor-tinta)' }}>Itens de equipamento</div>
        <div className="flex flex-wrap gap-3 mb-3">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar material ou código…"
            className="rounded-lg px-3 py-1.5 text-sm border outline-none w-64"
            style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-superficie)', color: 'var(--cor-tinta)' }}
          />
          <select
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value)}
            className="rounded-lg px-2 py-1.5 text-sm border outline-none"
            style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-superficie)', color: 'var(--cor-tinta)' }}
          >
            {ORDENACOES.map((o) => (
              <option key={o.valor} value={o.valor}>{o.rotulo}</option>
            ))}
          </select>
          <span className="text-xs self-center" style={{ color: 'var(--cor-mutado)' }}>
            {itens.length} de {local.itens.length} itens
            {categorias.length > 0 && ` · filtrado por ${categorias.length} categoria(s)`}
          </span>
        </div>
        <div className="overflow-x-auto rounded-2xl border" style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left font-semibold border-b" style={{ color: 'var(--cor-tinta)', borderColor: 'var(--cor-borda)' }}>
                <th className="px-3 py-2.5">Categoria</th>
                <th className="px-3 py-2.5">Código</th>
                <th className="px-3 py-2.5">Material</th>
                <th className="px-3 py-2.5">Qtd</th>
                <th className="px-3 py-2.5">Valor unit.</th>
                <th className="px-3 py-2.5">Valor total</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, indice) => (
                <tr key={`${item.cod}-${item.material}-${indice}`} className="border-b last:border-0 font-mono hover:bg-[var(--cor-hover)] transition-colors" style={{ borderColor: 'var(--cor-borda)' }}>
                  <td className="px-3 py-2 font-sans">{item.categoria}</td>
                  <td className="px-3 py-2">{item.cod}</td>
                  <td className="px-3 py-2 font-sans">{item.material}</td>
                  <td className="px-3 py-2">{item.qtd}</td>
                  <td className="px-3 py-2">{fmtMoeda(item.valor_unit)}</td>
                  <td className="px-3 py-2 font-semibold" style={{ color: 'var(--cor-tinta)' }}>{fmtMoeda(item.valor_total)}</td>
                </tr>
              ))}
              {itens.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center" style={{ color: 'var(--cor-mutado)' }}>
                    Nenhum item encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
