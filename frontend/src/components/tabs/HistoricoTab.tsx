import { useEffect, useState } from 'react'
import type { Upload } from '../../lib/types'
import { api } from '../../lib/api'
import PlotlyChart from '../PlotlyChart'

interface Registro {
  upload_id: number
  filename: string
  uploaded_at: string
  local: string
  [campo: string]: unknown
}

interface Props {
  uploads: Upload[]
  uploadAtivo: number | null
  onUploadsChanged: () => void
}

const METRICAS = [
  { valor: 'investimento', rotulo: 'Investimento por upload' },
  { valor: 'saldo_mensal', rotulo: 'Saldo mensal por upload' },
  { valor: 'tempo_retorno', rotulo: 'Tempo de retorno (meses) por upload' },
]

export default function HistoricoTab({ uploads, uploadAtivo, onUploadsChanged }: Props) {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [local, setLocal] = useState<string>('')
  const [graficos, setGraficos] = useState<Record<string, string | null>>({})

  useEffect(() => {
    api
      .get<{ registros: Registro[] }>('/api/uploads/history')
      .then((d) => setRegistros(d.registros))
      .catch(() => setRegistros([]))
  }, [uploads])

  const locais = Array.from(new Set(registros.map((r) => r.local))).sort()

  useEffect(() => {
    if (!locais.includes(local)) setLocal(locais[0] ?? '')
  }, [locais.join('|')])

  useEffect(() => {
    if (!local) return
    let ativo = true
    setGraficos({})
    Promise.all(
      METRICAS.map(async (m) => {
        try {
          const resposta = await api.get<{ fig: string }>(
            `/api/uploads/history/chart?local=${encodeURIComponent(local)}&metrica=${m.valor}`,
          )
          if (ativo) setGraficos((g) => ({ ...g, [m.valor]: resposta.fig }))
        } catch {
          if (ativo) setGraficos((g) => ({ ...g, [m.valor]: null }))
        }
      }),
    )
    return () => {
      ativo = false
    }
  }, [local])

  async function excluir(uploadId: number) {
    await api.delete(`/api/uploads/${uploadId}`)
    onUploadsChanged()
  }

  return (
    <div>
      <div>
        <div className="text-[15px] font-semibold text-tinta my-1.5 mb-2.5">Uploads</div>
        {uploads.length === 0 && <div className="text-sm text-mutado">Nenhum upload ainda.</div>}
        <div className="rounded-xl border border-borda bg-superficie divide-y divide-borda">
          {uploads.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <span
                className="text-sm"
                style={{ color: uploadAtivo === u.id ? '#e07b1a' : 'transparent' }}
              >
                ●
              </span>
              <span className="flex-1 truncate">{u.filename}</span>
              <span className="text-mutado">{u.uploaded_at}</span>
              <button
                onClick={() => void excluir(u.id)}
                className="text-mutado hover:text-alerta text-xs"
              >
                Excluir
              </button>
            </div>
          ))}
        </div>
      </div>

      {registros.length > 0 && (
        <div className="mt-4">
          <div className="text-[15px] font-semibold text-tinta my-1.5 mb-2.5">Evolução por local</div>
          <select
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="rounded-lg px-2 py-1.5 text-sm border border-borda outline-none mb-3"
          >
            {locais.map((nome) => (
              <option key={nome} value={nome}>{nome}</option>
            ))}
          </select>
          {METRICAS.map((m) => (
            <div key={m.valor} className="mb-1">
              {graficos[m.valor] === undefined && <div className="text-sm text-mutado">Carregando…</div>}
              {graficos[m.valor] && <PlotlyChart figJson={graficos[m.valor] as string} />}
              {graficos[m.valor] === null && (
                <div className="text-sm text-mutado">Sem dados para {m.rotulo.toLowerCase()}.</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
