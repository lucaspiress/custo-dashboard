import { useEffect, useState } from 'react'
import type { ComparacaoVersoes, Local, Upload } from '../../lib/types'
import { fmtMoeda, fmtNumero } from '../../lib/format'
import { api } from '../../lib/api'
import PlotlyChart from '../PlotlyChart'

interface Props {
  uploads: Upload[]
  uploadId: number
  local: Local
}

const ROTULO_TIPO: Record<string, string> = {
  adicionado: 'Adicionado',
  removido: 'Removido',
  preco: 'Preço alterado',
  quantidade: 'Quantidade alterada',
}

export default function CompararVersoesTab({ uploads, uploadId, local }: Props) {
  const opcoes = uploads.map((u) => ({
    id: u.id,
    rotulo: `${u.filename} (${u.uploaded_at})`,
  }))
  const [base, setBase] = useState<number>(opcoes.find((o) => o.id !== uploadId)?.id ?? uploadId)
  const [dados, setDados] = useState<ComparacaoVersoes | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (opcoes.length < 2) return
    const alternativo = opcoes.find((o) => o.id !== uploadId)?.id
    setBase((atual) => (atual === uploadId && alternativo !== undefined ? alternativo : atual))
  }, [uploadId, opcoes.length])

  useEffect(() => {
    if (!base || base === uploadId || opcoes.length < 2) return
    let ativo = true
    setCarregando(true)
    setErro('')
    api
      .get<ComparacaoVersoes>(
        `/api/uploads/${uploadId}/compare?vs=${base}&local=${encodeURIComponent(local.nome)}`,
      )
      .then((d) => {
        if (ativo) setDados(d)
      })
      .catch((e) => {
        if (ativo) {
          setDados(null)
          setErro(e instanceof Error ? e.message : 'Erro ao comparar.')
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [base, uploadId, local, opcoes.length])

  if (opcoes.length < 2) {
    return (
      <div className="text-sm text-mutado">
        Envie pelo menos duas versões da planilha para comparar evolução.
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-sm text-mutado">Comparar a versão atual de</span>
        <span className="text-sm font-semibold text-tinta">{local.nome}</span>
        <span className="text-sm text-mutado">com</span>
        <select
          value={base}
          onChange={(e) => setBase(Number(e.target.value))}
          className="rounded-lg px-2 py-1.5 text-sm border border-borda outline-none max-w-md"
        >
          {opcoes.filter((o) => o.id !== uploadId).map((o) => (
            <option key={o.id} value={o.id}>{o.rotulo}</option>
          ))}
        </select>
      </div>

      {carregando && <div className="text-sm text-mutado">Comparando…</div>}
      {erro && <div className="text-sm text-alerta">{erro}</div>}

      {dados && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {dados.kpis.map((k, i) => {
              const delta = k.delta
              const positivo = k.rotulo === 'Tempo de retorno (meses)' || k.rotulo === 'Investimento' || k.rotulo === 'Equipamento' || k.rotulo === 'Mão de obra'
              const cor = delta === null ? 'text-mutado' : positivo ? (delta > 0 ? 'text-alerta' : 'text-sucesso') : (delta > 0 ? 'text-sucesso' : 'text-alerta')
              return (
                <div key={k.rotulo} className="rounded-xl border border-borda bg-superficie p-3.5" style={{ animationDelay: `${i * 60}ms`, animation: 'fadeInUp .4s ease-out both' }}>
                  <div className="text-[11.5px] font-medium uppercase tracking-wide text-mutado mb-1">{k.rotulo}</div>
                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-mutado text-sm">{fmtMoeda(k.antes)}</span>
                    <span className="text-tinta">→</span>
                    <span className="text-[17px] font-semibold text-tinta">{fmtMoeda(k.depois)}</span>
                    {k.delta !== null && (
                      <span className={`text-[13px] font-mono ${cor}`}>
                        {k.delta > 0 ? '+' : ''}{fmtMoeda(k.delta)}
                        {k.delta_pct !== null && ` (${k.delta_pct > 0 ? '+' : ''}${fmtNumero(k.delta_pct)})`}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mb-2">
            <PlotlyChart figJson={dados.grafico} />
          </div>

          <div>
            <div className="text-[15px] font-semibold text-tinta my-1.5 mb-2.5">
              Mudanças em itens ({dados.itens.length})
            </div>
            <div className="overflow-x-auto rounded-xl border border-borda bg-superficie">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-tinta font-semibold border-b border-borda">
                    <th className="px-3 py-2.5">Tipo</th>
                    <th className="px-3 py-2.5">Categoria</th>
                    <th className="px-3 py-2.5">Material</th>
                    <th className="px-3 py-2.5">Qtd antes</th>
                    <th className="px-3 py-2.5">Qtd depois</th>
                    <th className="px-3 py-2.5">Unit. antes</th>
                    <th className="px-3 py-2.5">Unit. depois</th>
                    <th className="px-3 py-2.5">Variação</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.itens.map((item, indice) => {
                    const cor =
                      item.tipo === 'adicionado'
                        ? 'text-sucesso'
                        : item.tipo === 'removido'
                          ? 'text-alerta'
                          : item.variacao !== null && item.variacao > 0
                            ? 'text-alerta'
                            : 'text-sucesso'
                    return (
                      <tr key={indice} className="border-b border-borda last:border-0 font-mono hover:bg-[#EFF6FF] transition-colors">
                        <td className="px-3 py-2">
                          <span className={`text-[10.5px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 text-white ${item.tipo === 'adicionado' ? 'bg-sucesso' : item.tipo === 'removido' ? 'bg-alerta' : 'bg-mutado'}`}>
                            {ROTULO_TIPO[item.tipo]}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-sans">{item.categoria}</td>
                        <td className="px-3 py-2 font-sans">{item.material}</td>
                        <td className="px-3 py-2">{item.qtd_antes ?? '—'}</td>
                        <td className="px-3 py-2">{item.qtd_depois ?? '—'}</td>
                        <td className="px-3 py-2">{item.valor_unit_antes !== null ? fmtMoeda(item.valor_unit_antes) : '—'}</td>
                        <td className="px-3 py-2">{item.valor_unit_depois !== null ? fmtMoeda(item.valor_unit_depois) : '—'}</td>
                        <td className={`px-3 py-2 font-semibold ${cor}`}>
                          {item.variacao !== null ? `${item.variacao > 0 ? '+' : ''}${fmtMoeda(item.variacao)}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
