import { useEffect, useMemo, useState } from 'react'
import { baixarRelatorio, listarRelatorios } from '../lib/api'
import type { Relatorio } from '../lib/types'
import { baixarBlob, fmtData } from '../lib/format'
import AppShell from '../components/AppShell'
import Botao from '../components/ui/Botao'

function fmtTamanho(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function RelatoriosPage() {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'gerado' | 'falha'>('todos')

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro('')
    listarRelatorios()
      .then((lista) => {
        if (ativo) setRelatorios(lista)
      })
      .catch((e) => {
        if (ativo) setErro(e instanceof Error ? e.message : 'Erro ao carregar relatórios.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [])

  const filtrados = useMemo(
    () => (filtroStatus === 'todos' ? relatorios : relatorios.filter((r) => r.status === filtroStatus)),
    [relatorios, filtroStatus]
  )

  async function baixar(rid: number) {
    setErro('')
    try {
      const blob = await baixarRelatorio(rid)
      baixarBlob(blob, `relatorio-${rid}.pdf`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao baixar relatório.')
    }
  }

  return (
    <AppShell titulo="Relatórios">
      {erro && <div className="text-sm mb-4" style={{ color: 'var(--cor-alerta)' }}>{erro}</div>}

      <div className="flex items-center gap-2 mb-4">
        <span className="text-[12px]" style={{ color: 'var(--cor-mutado)' }}>Status:</span>
        {(['todos', 'gerado', 'falha'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            className="h-8 px-3 rounded-lg text-[12.5px] font-medium transition-colors"
            style={
              filtroStatus === s
                ? { background: 'rgba(46, 89, 246, 0.2)', color: 'var(--cor-tinta)', border: '1px solid rgba(46, 89, 246, 0.5)' }
                : { background: 'var(--cor-elevado)', color: 'var(--cor-mutado)', border: '1px solid var(--cor-borda)' }
            }
          >
            {s === 'todos' ? 'Todos' : s === 'gerado' ? 'Gerados' : 'Falhas'}
          </button>
        ))}
      </div>

      {carregando && <div className="text-[13px]" style={{ color: 'var(--cor-mutado)' }}>Carregando...</div>}

      {!carregando && filtrados.length === 0 && (
        <div className="rounded-2xl border p-10 text-center" style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>
          <div className="text-[15px] font-semibold mb-1.5" style={{ color: 'var(--cor-tinta)' }}>Nenhum relatório</div>
          <div className="text-[13px]" style={{ color: 'var(--cor-mutado)' }}>
            Agende relatórios a partir de um dashboard publicado para gerar PDFs.
          </div>
        </div>
      )}

      {!carregando && filtrados.length > 0 && (
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-elevado)' }}>
                <th className="px-4 py-2.5 font-semibold" style={{ color: 'var(--cor-mutado)' }}>Data</th>
                <th className="px-4 py-2.5 font-semibold" style={{ color: 'var(--cor-mutado)' }}>Publicação</th>
                <th className="px-4 py-2.5 font-semibold" style={{ color: 'var(--cor-mutado)' }}>Tamanho</th>
                <th className="px-4 py-2.5 font-semibold" style={{ color: 'var(--cor-mutado)' }}>Status</th>
                <th className="px-4 py-2.5 font-semibold text-right" style={{ color: 'var(--cor-mutado)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((r) => (
                <tr key={r.id} className="border-b" style={{ borderColor: 'var(--cor-borda)' }}>
                  <td className="px-4 py-2.5" style={{ color: 'var(--cor-tinta)' }}>{fmtData(r.gerado_em)}</td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--cor-mutado)' }}>#{r.publicacao_id}</td>
                  <td className="px-4 py-2.5 tabular-nums" style={{ color: 'var(--cor-tinta)' }}>{fmtTamanho(r.tamanho_bytes)}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-block rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                      style={{
                        background: r.status === 'gerado' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: r.status === 'gerado' ? 'var(--cor-sucesso)' : 'var(--cor-alerta)',
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {r.status === 'gerado' ? (
                      <Botao variante="secundario" onClick={() => void baixar(r.id)}>Baixar</Botao>
                    ) : (
                      <span className="text-[12px]" style={{ color: 'var(--cor-mutado)' }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  )
}
