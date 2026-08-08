import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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

const ICONE_PDF = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></svg>)
const ICONE_EXCEL = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>)
const ICONE_UPLOAD = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>)
const ICONE_SAIR = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>)

const ICONES_ABAS: Record<string, ReactNode> = {
  'Visão Geral': (<><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>),
  Custos: (<><circle cx="12" cy="12" r="9" /><path d="M12 6v12" /><path d="M15.5 9.5c0-1.2-1.6-2-3.5-2s-3.5.8-3.5 2 1.6 2 3.5 2 3.5.8 3.5 2-1.6 2-3.5 2-3.5-.8-3.5-2" /></>),
  Payback: (<><polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" /></>),
  Insights: (<><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.8.7 1.3 1.6 1.5 2.5h5c.2-.9.7-1.8 1.5-2.5A6 6 0 0 0 12 3z" /></>),
  Comparativo: (<><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20V7" /></>),
  'Comparar Versões': (<><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7" /><path d="M11 18H8a2 2 0 0 1-2-2V9" /></>),
  Histórico: (<><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></>),
  Usuários: (<><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
}

export default function DashboardPage() {
  const { usuario, logout } = useAuth()
  const [uploads, setUploads] = useState<Upload[]>([])
  const [uploadId, setUploadId] = useState<number | null>(null)
  const [analise, setAnalise] = useState<AnaliseUpload | null>(null)
  const [localNome, setLocalNome] = useState<string | null>(null)
  const [aba, setAba] = useState('Visão Geral')
  const [categoriasFiltro, setCategoriasFiltro] = useState<string[]>([])
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

  const local = analise?.locais.find((l) => l.nome === localNome) ?? analise?.locais[0] ?? null

  const categorias = useMemo(
    () => (local ? Array.from(new Set(local.itens.map((i) => i.categoria))).sort() : []),
    [local]
  )

  function alternarCategoria(categoria: string) {
    setCategoriasFiltro((atual) =>
      atual.includes(categoria) ? atual.filter((c) => c !== categoria) : [...atual, categoria]
    )
  }

  async function enviarArquivo(file: File) {
    setEnviando(true)
    setErro('')
    try {
      const form = new FormData()
      form.append('arquivo', file)
      const resposta = await api.postForm<{ id: number; avisos: string[] }>('/api/uploads', form)
      setUploadId(resposta.id)
      setCategoriasFiltro([])
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

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="h-[64px] shrink-0 border-b border-[#1a2138] flex items-center justify-between gap-4 px-5 z-10"
        style={{ background: '#111e34' }}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <img src="/logo-sistema.png" alt="Rota Group" className="h-[32px] w-auto object-contain shrink-0" />
          <span className="w-px h-6 bg-[#2a3a56] shrink-0" />
          <span className="titulo-display text-[16px] font-semibold text-white tracking-wide truncate">Custo Dashboard</span>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
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
          {uploadId !== null && (
            <>
              <button
                onClick={() => void baixar(`/api/uploads/${uploadId}/report`, `Dashboard_Financeiro.pdf`)}
                className="h-9 rounded-lg px-3.5 text-[13px] font-medium bg-[#16243c] border border-[#2a3a56] text-[#b9c7e4] hover:text-white hover:border-[#10a0a0] transition-colors inline-flex items-center gap-2"
              >
                {ICONE_PDF}
                Relatório PDF
              </button>
              <button
                onClick={() => void baixar(`/api/uploads/${uploadId}/export`, 'Custos_export.xlsx')}
                className="h-9 rounded-lg px-3.5 text-[13px] font-medium bg-[#16243c] border border-[#2a3a56] text-[#b9c7e4] hover:text-white hover:border-[#10a0a0] transition-colors inline-flex items-center gap-2"
              >
                {ICONE_EXCEL}
                Exportar Excel
              </button>
              <span className="w-px h-6 bg-[#2a3a56] shrink-0" />
            </>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={enviando}
            className="h-9 rounded-lg px-4 text-[13px] font-semibold text-white inline-flex items-center gap-2 transition-opacity disabled:opacity-60 hover:opacity-90"
            style={{ background: '#0c7d74' }}
          >
            {ICONE_UPLOAD}
            {enviando ? 'Enviando…' : 'Enviar planilha'}
          </button>
          <span className="w-px h-6 bg-[#2a3a56] shrink-0" />
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0"
            style={{ background: 'rgba(16, 160, 160, 0.15)', color: '#10a0a0' }}
          >
            {usuario?.nome?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <span className="hidden lg:block text-[12.5px] text-[#b9c7e4]">{usuario?.nome}</span>
          <button
            onClick={() => void logout()}
            title="Sair"
            className="rounded-lg p-2 text-[#93a5c8] hover:text-white hover:bg-[#16243c] transition-colors"
          >
            {ICONE_SAIR}
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-72 shrink-0 border-r border-[#1a2138] flex flex-col overflow-y-auto" style={{ background: COR.sidebar }}>
          <nav className="p-3 pt-4 flex flex-col gap-1">
            {abas.map((nome) => (
              <button
                key={nome}
                onClick={() => setAba(nome)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium border-l-2 transition-colors ${
                  aba === nome
                    ? 'bg-[rgba(16,160,160,0.12)] text-white border-[#10a0a0]'
                    : 'border-transparent text-[#8fa3c7] hover:bg-superficie hover:text-white'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  {ICONES_ABAS[nome]}
                </svg>
                {nome}
              </button>
            ))}
          </nav>

          <div className="p-4 flex flex-col gap-4 border-t border-[#1a2138]">
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

                {categorias.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8fa3c7] mb-2">
                      Categorias
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => setCategoriasFiltro([])}
                        className={`text-left text-[12.5px] px-2.5 py-1.5 rounded-md border transition-colors ${
                          categoriasFiltro.length === 0
                            ? 'border-[#10a0a0] text-white bg-[rgba(16,160,160,0.12)]'
                            : 'border-transparent text-[#8fa3c7] hover:bg-superficie hover:text-white'
                        }`}
                      >
                        Todas
                      </button>
                      {categorias.map((c) => (
                        <button
                          key={c}
                          onClick={() => alternarCategoria(c)}
                          className={`text-left text-[12.5px] px-2.5 py-1.5 rounded-md border transition-colors ${
                            categoriasFiltro.includes(c)
                              ? 'border-[#10a0a0] text-white bg-[rgba(16,160,160,0.12)]'
                              : 'border-transparent text-[#8fa3c7] hover:bg-superficie hover:text-white'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {analise && analise.filename && (
            <div className="px-6 pt-4 text-[12.5px] text-mutado">
              Exibindo: <span className="text-[#10a0a0] font-semibold">{analise.filename}</span>
              {analise.uploaded_at && <span className="ml-1">({analise.uploaded_at})</span>}
            </div>
          )}

          <div className="p-6">
            {erro && <div className="text-sm text-alerta mb-4">{erro}</div>}

            {carregando && uploadId !== null && <div className="text-sm text-mutado">Carregando análise…</div>}

            {!carregando && !analise && uploads.length === 0 && (
              <div className="rounded-xl border border-borda bg-superficie p-7 text-center">
                <div className="text-[15px] font-semibold text-tinta mb-1.5">Nenhuma análise carregada ainda</div>
                <div className="text-[13px] text-mutado leading-relaxed">
                  Envie uma planilha de custo no template padrão pelo botão no topo.
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
                {aba === 'Custos' && local && (
                  <CustosTab local={local} categorias={categoriasFiltro} onCategorias={setCategoriasFiltro} />
                )}
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
    </div>
  )
}
