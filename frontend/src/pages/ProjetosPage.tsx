import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { fmtData, fmtMoeda } from '../lib/format'
import type { ProjetoResumo } from '../lib/types'

const ICONE_MAIS = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>)
const ICONE_UPLOAD = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>)
const ICONE_ABRIR = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>)
const ICONE_PLANILHA = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /></svg>)
const ICONE_EDITAR = (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" /></svg>)
const ICONE_LIXO = (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>)
const ICONE_SAIR = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>)

function Modal({
  titulo,
  valorNome,
  valorCliente,
  onNome,
  onCliente,
  aoSalvar,
  aoCancelar,
  salvando,
}: {
  titulo: string
  valorNome: string
  valorCliente: string
  onNome: (v: string) => void
  onCliente: (v: string) => void
  aoSalvar: () => void
  aoCancelar: () => void
  salvando: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-xl border border-borda bg-superficie p-5 shadow-2xl">
        <div className="text-[15px] font-semibold text-tinta mb-4">{titulo}</div>
        <label className="block text-[12px] text-mutado mb-1.5">Nome do projeto</label>
        <input
          autoFocus
          value={valorNome}
          onChange={(e) => onNome(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void aoSalvar()}
          placeholder="Ex.: Cliente X — Filiais 2026"
          className="w-full rounded-lg px-3 py-2 text-sm border border-borda bg-elevado text-tinta outline-none focus:border-[#10a0a0] mb-3"
        />
        <label className="block text-[12px] text-mutado mb-1.5">Cliente (opcional)</label>
        <input
          value={valorCliente}
          onChange={(e) => onCliente(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void aoSalvar()}
          placeholder="Nome do cliente"
          className="w-full rounded-lg px-3 py-2 text-sm border border-borda bg-elevado text-tinta outline-none focus:border-[#10a0a0]"
        />
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={aoCancelar}
            className="h-9 px-3.5 rounded-lg text-[13px] font-medium text-mutado hover:text-white hover:bg-elevado transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => void aoSalvar()}
            disabled={salvando}
            className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white inline-flex items-center gap-2 disabled:opacity-60"
            style={{ background: '#0c7d74' }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProjetosPage() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const [projetos, setProjetos] = useState<ProjetoResumo[]>([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalNovo, setModalNovo] = useState(false)
  const [modalEditar, setModalEditar] = useState<ProjetoResumo | null>(null)
  const [modalExcluir, setModalExcluir] = useState<ProjetoResumo | null>(null)
  const [nomeCampo, setNomeCampo] = useState('')
  const [clienteCampo, setClienteCampo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [importando, setImportando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function carregar() {
    setCarregando(true)
    try {
      setProjetos(await api.get<ProjetoResumo[]>('/api/projetos'))
      setErro('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar projetos.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    void carregar()
  }, [])

  function abrirNovo() {
    setNomeCampo('')
    setClienteCampo('')
    setModalNovo(true)
  }

  function abrirEditar(projeto: ProjetoResumo) {
    setModalEditar(projeto)
    setNomeCampo(projeto.nome)
    setClienteCampo(projeto.cliente ?? '')
  }

  async function salvarNovo() {
    if (!nomeCampo.trim()) return
    setSalvando(true)
    try {
      const criado = await api.post<{ id: number }>('/api/projetos', {
        nome: nomeCampo.trim(),
        cliente: clienteCampo.trim() || undefined,
      })
      setModalNovo(false)
      navigate(`/projetos/${criado.id}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar projeto.')
      setSalvando(false)
    }
  }

  async function salvarEditar() {
    if (!modalEditar || !nomeCampo.trim()) return
    setSalvando(true)
    try {
      await api.patch(`/api/projetos/${modalEditar.id}`, {
        nome: nomeCampo.trim(),
        cliente: clienteCampo.trim() || null,
      })
      setModalEditar(null)
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao renomear projeto.')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir() {
    if (!modalExcluir) return
    setSalvando(true)
    try {
      await api.delete(`/api/projetos/${modalExcluir.id}`)
      setModalExcluir(null)
      await carregar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir projeto.')
    } finally {
      setSalvando(false)
    }
  }

  async function importarArquivo(file: File) {
    setImportando(true)
    setErro('')
    try {
      const form = new FormData()
      form.append('arquivo', file)
      const criado = await api.postForm<{ id: number }>('/api/projetos/importar', form)
      navigate(`/projetos/${criado.id}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao importar planilha.')
      setImportando(false)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
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

      <main className="flex-1 w-full max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-tinta">Projetos</h1>
            <p className="text-[13px] text-mutado mt-0.5">Cada cliente/projeto tem seus locais, gráficos e entregas.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void importarArquivo(file)
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importando}
              className="h-9 rounded-lg px-3.5 text-[13px] font-medium bg-[#16243c] border border-[#2a3a56] text-[#b9c7e4] hover:text-white hover:border-[#10a0a0] transition-colors inline-flex items-center gap-2 disabled:opacity-60"
            >
              {ICONE_UPLOAD}
              {importando ? 'Importando…' : 'Importar planilha'}
            </button>
            <button
              onClick={abrirNovo}
              className="h-9 rounded-lg px-4 text-[13px] font-semibold text-white inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
              style={{ background: '#0c7d74' }}
            >
              {ICONE_MAIS}
              Novo projeto
            </button>
          </div>
        </div>

        {erro && <div className="text-sm text-alerta mb-4">{erro}</div>}

        {carregando && (
          <div className="text-sm text-mutado">Carregando projetos…</div>
        )}

        {!carregando && projetos.length === 0 && (
          <div className="rounded-xl border border-borda bg-superficie p-10 text-center">
            <div className="text-[15px] font-semibold text-tinta mb-1.5">Nenhum projeto cadastrado</div>
            <div className="text-[13px] text-mutado leading-relaxed mb-4">
              Crie um projeto e preencha os dados na tela, ou importe uma planilha
              no template padrão para começar.
            </div>
            <button
              onClick={abrirNovo}
              className="h-9 rounded-lg px-4 text-[13px] font-semibold text-white inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
              style={{ background: '#0c7d74' }}
            >
              {ICONE_MAIS}
              Criar primeiro projeto
            </button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projetos.map((projeto) => (
            <div
              key={projeto.id}
              className="rounded-xl border border-borda bg-superficie p-5 flex flex-col gap-4 hover:border-[rgba(16,160,160,0.5)] transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <button
                    onClick={() => navigate(`/projetos/${projeto.id}`)}
                    className="text-[15px] font-semibold text-tinta hover:text-[#10a0a0] text-left leading-snug transition-colors"
                  >
                    {projeto.nome}
                  </button>
                  <div className="text-[12.5px] text-mutado mt-0.5 truncate">
                    {projeto.cliente ?? 'Sem cliente'} · {fmtData(projeto.criado_em)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-elevado px-2 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-mutado">Locais</div>
                  <div className="text-[14px] font-semibold text-tinta">{projeto.num_locais}</div>
                </div>
                <div className="rounded-lg bg-elevado px-2 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-mutado">Itens</div>
                  <div className="text-[14px] font-semibold text-tinta">{projeto.num_itens}</div>
                </div>
                <div className="rounded-lg bg-elevado px-2 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-mutado">Invest.</div>
                  <div className="text-[14px] font-semibold text-tinta">{fmtMoeda(projeto.totais.investimento)}</div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[#1a2138]">
                <button
                  onClick={() => navigate(`/projetos/${projeto.id}`)}
                  className="h-8 px-2.5 rounded-lg text-[12.5px] font-medium inline-flex items-center gap-1.5 text-[#b9c7e4] hover:text-white hover:bg-elevado transition-colors"
                >
                  {ICONE_ABRIR}
                  Dashboard
                </button>
                <button
                  onClick={() => navigate(`/projetos/${projeto.id}/planilha`)}
                  className="h-8 px-2.5 rounded-lg text-[12.5px] font-medium inline-flex items-center gap-1.5 text-[#b9c7e4] hover:text-white hover:bg-elevado transition-colors"
                >
                  {ICONE_PLANILHA}
                  Planilha
                </button>
                <button
                  onClick={() => abrirEditar(projeto)}
                  title="Renomear"
                  className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-mutado hover:text-white hover:bg-elevado transition-colors"
                >
                  {ICONE_EDITAR}
                </button>
                <button
                  onClick={() => setModalExcluir(projeto)}
                  title="Excluir"
                  className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-mutado hover:text-alerta hover:bg-[rgba(239,68,68,0.1)] transition-colors"
                >
                  {ICONE_LIXO}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {modalNovo && (
        <Modal
          titulo="Novo projeto"
          valorNome={nomeCampo}
          valorCliente={clienteCampo}
          onNome={setNomeCampo}
          onCliente={setClienteCampo}
          aoSalvar={salvarNovo}
          aoCancelar={() => setModalNovo(false)}
          salvando={salvando}
        />
      )}

      {modalEditar && (
        <Modal
          titulo="Editar projeto"
          valorNome={nomeCampo}
          valorCliente={clienteCampo}
          onNome={setNomeCampo}
          onCliente={setClienteCampo}
          aoSalvar={salvarEditar}
          aoCancelar={() => setModalEditar(null)}
          salvando={salvando}
        />
      )}

      {modalExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-borda bg-superficie p-5 shadow-2xl">
            <div className="text-[15px] font-semibold text-tinta mb-2">Excluir projeto?</div>
            <p className="text-[13px] text-mutado leading-relaxed">
              O projeto <b className="text-tinta">{modalExcluir.nome}</b> e todos os seus locais e
              itens serão removidos. Essa ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setModalExcluir(null)}
                className="h-9 px-3.5 rounded-lg text-[13px] font-medium text-mutado hover:text-white hover:bg-elevado transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => void excluir()}
                disabled={salvando}
                className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white disabled:opacity-60"
                style={{ background: '#b42323' }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
