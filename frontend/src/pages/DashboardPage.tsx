import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { baixarBlob } from '../lib/format'
import { COR } from '../lib/theme'
import type { AnaliseUpload, Upload } from '../lib/types'
import VisaoGeralTab from '../components/tabs/VisaoGeralTab'
import CustosTab from '../components/tabs/CustosTab'
import PaybackTab from '../components/tabs/PaybackTab'
import InsightsTab from '../components/tabs/InsightsTab'
import ComparativoTab from '../components/tabs/ComparativoTab'
import CompararVersoesTab from '../components/tabs/CompararVersoesTab'
import HistoricoTab from '../components/tabs/HistoricoTab'
import UsuariosTab from '../components/tabs/UsuariosTab'

const ABAS_PADRAO = ['Visão Geral', 'Custos', 'Payback', 'Insights', 'Comparativo', 'Comparar Versões', 'Histórico']

export default function DashboardPage() {
  const { usuario, logout } = useAuth()
  const [uploads, setUploads] = useState<Upload[]>([])
  const [uploadId, setUploadId] = useState<number | null>(null)
  const [analise, setAnalise] = useState<AnaliseUpload | null>(null)
  const [localNome, setLocalNome] = useState<string | null>(null)
  const [aba, setAba] = useState('Visão Geral')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const abas = usuario?.papel === 'admin' ? [...ABAS_PADRAO, 'Usuários'] : ABAS_PADRAO

  const carregarUploads = useCallback(() => {
    api
      .get<Upload[]>('/api/uploads')
      .then((lista) => {
        setUploads(lista)
        if (lista.length > 0) {
          setUploadId((atual) => {
            const existe = lista.some((u) => u.id === atual)
            return existe ? atual : lista[0].id
          })
        } else {
          setUploadId(null)
          setAnalise(null)
          setLocalNome(null)
        }
      })
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao listar uploads.'))
      .finally(() => setCarregando(false))
  }, [])

  useEffect(carregarUploads, [carregarUploads])

  useEffect(() => {
    if (uploadId === null) return
    let ativo = true
    setCarregando(true)
    setAnalise(null)
    api
      .get<AnaliseUpload>(`/api/uploads/${uploadId}`)
      .then((dados) => {
        if (!ativo) return
        setAnalise(dados)
        setLocalNome((atual) => {
          const nomes = dados.locais.map((l) => l.nome)
          return atual && nomes.includes(atual) ? atual : (nomes[0] ?? null)
        })
      })
      .catch((e) => {
        if (ativo) setErro(e instanceof Error ? e.message : 'Erro ao carregar a análise.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [uploadId])

  async function enviarArquivo(file: File) {
    setEnviando(true)
    setErro('')
    try {
      const form = new FormData()
      form.append('arquivo', file)
      const resposta = await api.postForm<{ id: number; avisos: string[] }>('/api/uploads', form)
      setUploadId(resposta.id)
      await carregarUploads()
      setAba('Visão Geral')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao enviar o arquivo.')
    } finally {
      setEnviando(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function baixar(caminho: string, nome: string) {
    try {
      const blob = await api.blob(caminho)
      baixarBlob(blob, nome)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar o arquivo.')
    }
  }

  const local = analise?.locais.find((l) => l.nome === localNome) ?? analise?.locais[0] ?? null

  return (
    <div className="min-h-screen flex">
      <aside className="w-72 shrink-0 border-r border-[#1a2138] flex flex-col" style={{ background: COR.sidebar }}>
        <div className="p-4 border-b border-[#1a2138] flex items-center justify-between gap-2">
          <img src="/logo-prince.png" alt="Rota Group" className="h-[24px] w-auto object-contain" />
          <button onClick={() => void logout()} className="text-xs text-[#93a5c8] hover:text-white shrink-0">
            Sair
          </button>
        </div>
        <div className="p-4 flex flex-col gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8fa3c7] mb-2">
              Entrada de dados
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void enviarArquivo(file)
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={enviando}
              className="w-full rounded-xl border border-dashed border-[#10a0a0] bg-superficie py-5 text-sm text-[#c6d0e4] hover:text-white hover:border-[#35b8b8] transition-colors disabled:opacity-60"
            >
              {enviando ? 'Enviando…' : 'Enviar planilha (.xlsx)'}
            </button>
          </div>

          {uploads.length > 0 && (
            <>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8fa3c7] mb-2">
                  Ver análise de
                </div>
                <select
                  value={uploadId ?? ''}
                  onChange={(e) => setUploadId(Number(e.target.value))}
                  className="w-full rounded-lg px-2 py-1.5 text-sm border border-borda outline-none bg-superficie text-tinta"
                >
                  {uploads.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.filename} ({u.uploaded_at})
                    </option>
                  ))}
                </select>
              </div>

              {analise && analise.locais.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8fa3c7] mb-2">
                    Local
                  </div>
                  <select
                    value={localNome ?? ''}
                    onChange={(e) => setLocalNome(e.target.value)}
                    className="w-full rounded-lg px-2 py-1.5 text-sm border border-borda outline-none bg-superficie text-tinta"
                  >
                    {analise.locais.map((l) => (
                      <option key={l.nome} value={l.nome}>{l.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              {uploadId !== null && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => void baixar(`/api/uploads/${uploadId}/report`, `Dashboard_Financeiro.pdf`)}
                    className="botao-marca rounded-lg py-2 text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Baixar relatório em PDF
                  </button>
                  <button
                    onClick={() => void baixar(`/api/uploads/${uploadId}/export`, 'Custos_export.xlsx')}
                    className="rounded-lg py-2 text-sm font-medium border border-borda text-[#c6d0e4] bg-superficie hover:text-white hover:border-[#10a0a0] transition-colors"
                  >
                    Exportar dados em Excel
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="flex items-center justify-between gap-3 px-6 pt-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-elevado border border-borda">
              <img src="/icon-atalho.png" alt="Rota Group" className="w-6 h-6 rounded-md" />
            </div>
            <div>
              <div className="titulo-display text-[22px] font-bold leading-tight text-tinta">Custo Dashboard</div>
              <div className="text-[13px] text-mutado">
                Análise automática de planilhas de custo — relatório, payback e insights
              </div>
            </div>
          </div>
        </header>

        {analise && analise.filename && (
          <div className="px-6 pt-2 text-[12.5px] text-mutado">
            Exibindo: <span className="text-[#10a0a0] font-semibold">{analise.filename}</span>
            {analise.uploaded_at && <span className="ml-1">({analise.uploaded_at})</span>}
          </div>
        )}

        <nav className="flex gap-1 px-6 mt-4 border-b border-borda overflow-x-auto">
          {abas.map((nome) => (
            <button
              key={nome}
              onClick={() => setAba(nome)}
              className={`px-3 py-2 text-[13.5px] font-medium border-b-2 whitespace-nowrap transition-colors ${
                aba === nome
                  ? 'border-[#10a0a0] text-[#10a0a0]'
                  : 'border-transparent text-mutado hover:text-tinta'
              }`}
            >
              {nome}
            </button>
          ))}
        </nav>

        <div className="p-6">
          {erro && <div className="text-sm text-alerta mb-4">{erro}</div>}

          {carregando && uploadId !== null && <div className="text-sm text-mutado">Carregando análise…</div>}

          {!carregando && !analise && uploads.length === 0 && (
            <div className="rounded-xl border border-borda bg-superficie p-7 text-center">
              <div className="text-[15px] font-semibold text-tinta mb-1.5">Nenhuma análise carregada ainda</div>
              <div className="text-[13px] text-mutado leading-relaxed">
                Envie uma planilha de custo no template padrão pela barra lateral.
                <br />
                O arquivo precisa ter a aba <b>RELATORIO</b> (coluna LOCAL) e abas de equipamento
                (MATERIAL ALARME / MATERIAL CFTV).
              </div>
            </div>
          )}

          {!carregando && analise && (
            <>
              {analise.avisos.map((aviso, indice) => (
                <div key={indice} className="text-sm text-destaque bg-[rgba(224,123,26,0.10)] border border-[rgba(224,123,26,0.35)] rounded-lg px-3 py-2 mb-3">
                  {aviso}
                </div>
              ))}
              {aba === 'Visão Geral' && local && <VisaoGeralTab analise={analise} local={local} />}
              {aba === 'Custos' && local && <CustosTab local={local} />}
              {aba === 'Payback' && local && uploadId !== null && (
                <PaybackTab uploadId={uploadId} local={local} />
              )}
              {aba === 'Insights' && local && <InsightsTab local={local} />}
              {aba === 'Comparativo' && uploadId !== null && <ComparativoTab uploadId={uploadId} />}
              {aba === 'Comparar Versões' && local && uploadId !== null && (
                <CompararVersoesTab uploads={uploads} uploadId={uploadId} local={local} />
              )}
              {aba === 'Histórico' && <HistoricoTab uploads={uploads} uploadAtivo={uploadId} onUploadsChanged={carregarUploads} />}
              {aba === 'Usuários' && usuario?.papel === 'admin' && <UsuariosTab />}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
