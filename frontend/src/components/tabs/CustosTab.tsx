import { useMemo, useState } from 'react'
import type { Local } from '../../lib/types'
import { fmtMoeda } from '../../lib/format'
import PlotlyChart from '../PlotlyChart'

interface Props {
  local: Local
}

const ORDENACOES = [
  { valor: 'desc', rotulo: 'Valor total (maior primeiro)' },
  { valor: 'asc', rotulo: 'Valor total (menor primeiro)' },
  { valor: 'categoria', rotulo: 'Categoria' },
  { valor: 'material', rotulo: 'Material (A–Z)' },
] as const

export default function CustosTab({ local }: Props) {
  const [busca, setBusca] = useState('')
  const [categorias, setCategorias] = useState<string[]>([])
  const [ordenacao, setOrdenacao] = useState<string>('desc')

  const todasCategorias = useMemo(
    () => Array.from(new Set(local.itens.map((i) => i.categoria))).sort(),
    [local],
  )

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
    <div>
      <div className="grid grid-cols-2 gap-4">
        {local.graficos.composicao && <PlotlyChart figJson={local.graficos.composicao} />}
        {local.graficos.categorias && <PlotlyChart figJson={local.graficos.categorias} />}
      </div>
      {local.graficos.pareto && <PlotlyChart figJson={local.graficos.pareto} />}

      <div className="mt-2">
        <div className="text-[15px] font-semibold text-tinta my-1.5 mb-2.5">Itens de equipamento</div>
        <div className="flex flex-wrap gap-3 mb-3">
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar material ou código…"
            className="rounded-lg px-3 py-1.5 text-sm border border-borda outline-none focus:border-primaria w-64"
          />
          <select
            multiple
            value={categorias}
            onChange={(e) => setCategorias(Array.from(e.target.selectedOptions, (o) => o.value))}
            className="rounded-lg px-2 py-1.5 text-sm border border-borda outline-none min-w-44"
            title="Filtrar por categoria (Ctrl+clique)"
          >
            {todasCategorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value)}
            className="rounded-lg px-2 py-1.5 text-sm border border-borda outline-none"
          >
            {ORDENACOES.map((o) => (
              <option key={o.valor} value={o.valor}>{o.rotulo}</option>
            ))}
          </select>
          <span className="text-xs text-mutado self-center">
            {itens.length} de {local.itens.length} itens
          </span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-borda bg-superficie">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-tinta font-semibold border-b border-borda">
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
                <tr key={`${item.cod}-${item.material}-${indice}`} className="border-b border-borda last:border-0 font-mono hover:bg-[#EFF6FF] transition-colors">
                  <td className="px-3 py-2 font-sans">{item.categoria}</td>
                  <td className="px-3 py-2">{item.cod}</td>
                  <td className="px-3 py-2 font-sans">{item.material}</td>
                  <td className="px-3 py-2">{item.qtd}</td>
                  <td className="px-3 py-2">{fmtMoeda(item.valor_unit)}</td>
                  <td className="px-3 py-2 font-semibold text-tinta">{fmtMoeda(item.valor_total)}</td>
                </tr>
              ))}
              {itens.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-mutado">
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
