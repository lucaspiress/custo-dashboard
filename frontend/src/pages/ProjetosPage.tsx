import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { fmtData, fmtMoeda } from '../lib/format'
import { validarArquivoPlanilha } from '../lib/import-file'
import type { ProjetoResumo } from '../lib/types'
import { construirRotaProjeto, ROTAS_CANONICAS } from '../lib/routes'
import { ProjetosCarregando } from '../components/ProjetoLoading'
import AppShell from '../components/AppShell'
import Botao from '../components/ui/Botao'
import Modal from '../components/ui/Modal'
import KpiCard from '../components/KpiCard'

const ICONE_UPLOAD = (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)
const ICONE_ABRIR = (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)
const ICONE_PLANILHA = (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
)
const ICONE_EDITAR = (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
  </svg>
)
const ICONE_LIXO = (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

interface UsuarioOption {
  id: number
  nome: string
  username: string
}

function ModalProjeto({
  titulo,
  valorNome,
  valorCliente,
  valorClienteUsuario,
  onNome,
  onCliente,
  onClienteUsuario,
  clientes,
  aoSalvar,
  aoCancelar,
  salvando,
}: {
  titulo: string
  valorNome: string
  valorCliente: string
  valorClienteUsuario: number | null
  onNome: (v: string) => void
  onCliente: (v: string) => void
  onClienteUsuario: (id: number | null) => void
  clientes: UsuarioOption[]
  aoSalvar: () => void
  aoCancelar: () => void
  salvando: boolean
}) {
  return (
    <Modal titulo={titulo} onFechar={aoCancelar}>
      <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Nome do projeto</label>
      <input
        autoFocus
        value={valorNome}
        onChange={(e) => onNome(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void aoSalvar()}
        placeholder="Ex.: Cliente X — Filiais 2026"
        className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3"
        style={{
          borderColor: 'var(--cor-borda)',
          background: 'var(--cor-elevado)',
          color: 'var(--cor-tinta)',
        }}
      />
      <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Cliente (opcional)</label>
      <input
        value={valorCliente}
        onChange={(e) => onCliente(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void aoSalvar()}
        placeholder="Nome do cliente"
        className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3"
        style={{
          borderColor: 'var(--cor-borda)',
          background: 'var(--cor-elevado)',
          color: 'var(--cor-tinta)',
        }}
      />
      <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>
        Acesso do cliente (opcional)
      </label>
      <select
        value={valorClienteUsuario == null ? '' : String(valorClienteUsuario)}
        onChange={(e) => onClienteUsuario(e.target.value ? Number(e.target.value) : null)}
        className="w-full rounded-lg px-3 py-2 text-sm border outline-none"
        style={{
          borderColor: 'var(--cor-borda)',
          background: 'var(--cor-elevado)',
          color: 'var(--cor-tinta)',
        }}
      >
        <option value="">Sem acesso de cliente</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>{c.nome} ({c.username})</option>
        ))}
      </select>
      <div className="flex justify-end gap-2 mt-5">
        <Botao variante="fantasma" onClick={aoCancelar}>Cancelar</Botao>
        <Botao onClick={() => void aoSalvar()} disabled={salvando}>Salvar</Botao>
      </div>
    </Modal>
  )
}

export default function ProjetosPage() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const papel = usuario?.papel ?? 'usuario'
  const somenteLeitura = papel === 'cliente'
  const [projetos, setProjetos] = useState<ProjetoResumo[]>([])
  const [clientes, setClientes] = useState<UsuarioOption[]>([])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalNovo, setModalNovo] = useState(false)
  const [modalEditar, setModalEditar] = useState<ProjetoResumo | null>(null)
  const [modalExcluir, setModalExcluir] = useState<ProjetoResumo | null>(null)
  const [nomeCampo, setNomeCampo] = useState('')
  const [clienteCampo, setClienteCampo] = useState('')
  const [clienteUsuarioCampo, setClienteUsuarioCampo] = useState<number | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [busca, setBusca] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function rotaDados(projetoId: number) {
    return construirRotaProjeto(ROTAS_CANONICAS.projetoDados, projetoId) ?? ROTAS_CANONICAS.projetos
  }

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

  async function carregarClientes() {
    if (somenteLeitura) return
    try {
      const usuarios = await api.get<Array<{ id: number; nome: string; username: string; papel: string }>>('/api/users')
      setClientes(usuarios.filter((u) => u.papel === 'cliente').map((u) => ({ id: u.id, nome: u.nome, username: u.username })))
    } catch {
      setClientes([])
    }
  }

  useEffect(() => {
    void carregar()
    void carregarClientes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function abrirNovo() {
    setNomeCampo('')
    setClienteCampo('')
    setClienteUsuarioCampo(null)
    setModalNovo(true)
  }

  function abrirEditar(projeto: ProjetoResumo) {
    setModalEditar(projeto)
    setNomeCampo(projeto.nome)
    setClienteCampo(projeto.cliente ?? '')
    setClienteUsuarioCampo(projeto.cliente_usuario_id ?? null)
  }

  async function salvarNovo() {
    if (!nomeCampo.trim()) return
    setSalvando(true)
    try {
      const criado = await api.post<{ id: number }>('/api/projetos', {
        nome: nomeCampo.trim(),
        cliente: clienteCampo.trim() || undefined,
        cliente_usuario_id: clienteUsuarioCampo,
      })
      setModalNovo(false)
      navigate(rotaDados(criado.id))
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
        cliente_usuario_id: clienteUsuarioCampo,
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
      navigate(rotaDados(criado.id))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao importar planilha.')
      setImportando(false)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function selecionarArquivo(file: File | undefined) {
    if (!file) return
    if (!validarArquivoPlanilha(file)) {
      setErro('Selecione uma planilha .xlsx no template padrão.')
      return
    }
    void importarArquivo(file)
  }

  const totais = useMemo(() => {
    const numLocais = projetos.reduce((soma, p) => soma + p.num_locais, 0)
    const numItens = projetos.reduce((soma, p) => soma + p.num_itens, 0)
    const investimento = projetos.reduce((soma, p) => soma + p.totais.investimento, 0)
    const saldo = projetos.reduce((soma, p) => soma + p.totais.saldo_mensal, 0)
    return { numLocais, numItens, investimento, saldo }
  }, [projetos])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return projetos
    return projetos.filter(
      (p) => p.nome.toLowerCase().includes(termo) || (p.cliente ?? '').toLowerCase().includes(termo)
    )
  }, [projetos, busca])

  return (
    <AppShell saudacao busca buscaValor={busca} onBusca={setBusca} buscaPlaceholder="Buscar projetos ou clientes…"
      acoes={
        !somenteLeitura ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                selecionarArquivo(file)
              }}
            />
            <Botao variante="secundario" onClick={() => fileRef.current?.click()} disabled={importando}>
              {ICONE_UPLOAD}
              {importando ? 'Importando…' : 'Importar planilha'}
            </Botao>
            <Botao onClick={abrirNovo}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Novo projeto
            </Botao>
          </>
        ) : undefined
      }
    >
      {!carregando && projetos.length > 0 && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <KpiCard rotulo="Projetos" valor={String(projetos.length)} sub="Total cadastrados" cor="#5b8cff" />
          <KpiCard rotulo="Locais" valor={String(totais.numLocais)} sub="Unidades analisadas" cor="#18d6ec" atraso={60} />
          <KpiCard rotulo="Investimento" valor={fmtMoeda(totais.investimento)} sub="Mão de obra + equipamento" cor="#e07b1a" atraso={120} />
          <KpiCard rotulo="Saldo mensal" valor={fmtMoeda(totais.saldo)} sub="Somado dos locais" cor="#10b981" atraso={180} />
        </div>
      )}

      <div
        {...(!somenteLeitura ? { role: 'button' as const, tabIndex: 0 } : {})}
        aria-label={somenteLeitura ? 'Importação de planilha indisponível para leitura' : 'Importar planilha por arrastar e soltar'}
        onClick={() => !somenteLeitura && fileRef.current?.click()}
        onKeyDown={(e) => {
          if (somenteLeitura) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileRef.current?.click()
          }
        }}
        onDragOver={(e) => !somenteLeitura && e.preventDefault()}
        onDrop={(e) => {
          if (somenteLeitura) return
          e.preventDefault()
          selecionarArquivo(e.dataTransfer.files[0])
        }}
        className={`mb-5 rounded-xl border border-dashed px-5 py-4 text-center transition-colors focus:outline-none ${somenteLeitura ? 'cursor-default' : 'cursor-pointer'}`}
        style={{
          borderColor: 'var(--cor-borda)',
          background: 'rgba(46, 89, 246, 0.04)',
        }}
      >
        <div className="text-[13px] font-medium" style={{ color: 'var(--cor-tinta)' }}>{somenteLeitura ? 'Importação indisponível' : 'Arraste uma planilha aqui'}</div>
        <div className="mt-0.5 text-[12px]" style={{ color: 'var(--cor-mutado)' }}>{somenteLeitura ? 'Seu perfil tem acesso somente para leitura.' : 'ou clique para selecionar um arquivo .xlsx'}</div>
      </div>

      {erro && <div className="text-sm mb-4" style={{ color: 'var(--cor-alerta)' }}>{erro}</div>}

      {carregando && <ProjetosCarregando />}

      {!carregando && filtrados.length === 0 && (
        <div className="rounded-2xl border p-10 text-center" style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>
          <div className="text-[15px] font-semibold mb-1.5" style={{ color: 'var(--cor-tinta)' }}>
            {busca ? 'Nenhum projeto encontrado' : 'Nenhum projeto cadastrado'}
          </div>
          <div className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--cor-mutado)' }}>
            {busca
              ? `Nada corresponde a “${busca}”.`
              : 'Crie um projeto e preencha os dados na tela, ou importe uma planilha no template padrão para começar.'}
          </div>
          {busca ? <Botao variante="secundario" onClick={() => setBusca('')}>Limpar busca</Botao> : !somenteLeitura && (
            <Botao onClick={abrirNovo}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              Criar primeiro projeto
            </Botao>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtrados.map((projeto) => (
          <div
            key={projeto.id}
            className="rounded-2xl border p-5 flex flex-col gap-4 transition-colors"
            style={{
              background: 'var(--cor-superficie)',
              borderColor: 'var(--cor-borda)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <button
                  type="button"
                 onClick={() => navigate(construirRotaProjeto(ROTAS_CANONICAS.projetoVisaoGeral, projeto.id) ?? ROTAS_CANONICAS.projetos)}
                  className="text-[15px] font-semibold text-left leading-snug transition-colors"
                  style={{ color: 'var(--cor-tinta)' }}
                >
                  {projeto.nome}
                </button>
                <div className="text-[12.5px] mt-0.5 truncate" style={{ color: 'var(--cor-mutado)' }}>
                  {projeto.cliente ?? 'Sem cliente'} · {fmtData(projeto.criado_em)}
                </div>
              </div>
              <span className="shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide" style={{ borderColor: projeto.num_locais === 0 && projeto.num_itens === 0 ? 'rgba(224,123,26,.45)' : 'rgba(16,185,129,.4)', color: projeto.num_locais === 0 && projeto.num_itens === 0 ? 'var(--cor-destaque)' : 'var(--cor-sucesso)' }}>
                {projeto.num_locais === 0 && projeto.num_itens === 0 ? 'Sem dados' : 'Dados cadastrados'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg px-2 py-2" style={{ background: 'var(--cor-elevado)' }}>
                <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--cor-mutado)' }}>Locais</div>
                <div className="text-[14px] font-semibold tabular-nums" style={{ color: 'var(--cor-tinta)' }}>{projeto.num_locais}</div>
              </div>
              <div className="rounded-lg px-2 py-2" style={{ background: 'var(--cor-elevado)' }}>
                <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--cor-mutado)' }}>Itens</div>
                <div className="text-[14px] font-semibold tabular-nums" style={{ color: 'var(--cor-tinta)' }}>{projeto.num_itens}</div>
              </div>
              <div className="rounded-lg px-2 py-2" style={{ background: 'var(--cor-elevado)' }}>
                <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--cor-mutado)' }}>Invest.</div>
                <div className="text-[14px] font-semibold tabular-nums" style={{ color: 'var(--cor-tinta)' }}>{fmtMoeda(projeto.totais.investimento)}</div>
              </div>
            </div>

            <div
              className="flex items-center justify-between gap-1.5 pt-1 border-t"
              style={{ borderColor: 'var(--cor-borda)' }}
            >
              <button
                type="button"
                onClick={() => navigate(construirRotaProjeto(ROTAS_CANONICAS.projetoVisaoGeral, projeto.id) ?? ROTAS_CANONICAS.projetos)}
                aria-label={`Abrir visão geral do projeto ${projeto.nome}`}
                className="h-9 rounded-lg bg-[#2e59f6] px-3 text-[12.5px] font-semibold text-white inline-flex items-center gap-1.5 transition-colors hover:bg-[#4669f7]"
              >
                {ICONE_ABRIR}
                Abrir visão geral
              </button>
              <button
                onClick={() => navigate(rotaDados(projeto.id))}
                className="h-8 px-2.5 rounded-lg text-[12.5px] font-medium inline-flex items-center gap-1.5 transition-colors"
                style={{ color: 'var(--cor-mutado)' }}
              >
                {ICONE_PLANILHA}
                Planilha
              </button>
              {!somenteLeitura && (
                <>
                  <button
                    type="button"
                    onClick={() => abrirEditar(projeto)}
                    title="Renomear"
                    aria-label={`Editar projeto ${projeto.nome}`}
                    className="h-8 w-8 rounded-lg inline-flex items-center justify-center transition-colors"
                    style={{ color: 'var(--cor-mutado)' }}
                  >
                    {ICONE_EDITAR}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalExcluir(projeto)}
                    title="Excluir"
                    aria-label={`Excluir projeto ${projeto.nome}`}
                    className="h-8 w-8 rounded-lg inline-flex items-center justify-center transition-colors"
                    style={{ color: 'var(--cor-mutado)' }}
                  >
                    {ICONE_LIXO}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {modalNovo && (
        <ModalProjeto
          titulo="Novo projeto"
          valorNome={nomeCampo}
          valorCliente={clienteCampo}
          valorClienteUsuario={clienteUsuarioCampo}
          onNome={setNomeCampo}
          onCliente={setClienteCampo}
          onClienteUsuario={setClienteUsuarioCampo}
          clientes={clientes}
          aoSalvar={salvarNovo}
          aoCancelar={() => setModalNovo(false)}
          salvando={salvando}
        />
      )}

      {modalEditar && (
        <ModalProjeto
          titulo="Editar projeto"
          valorNome={nomeCampo}
          valorCliente={clienteCampo}
          valorClienteUsuario={clienteUsuarioCampo}
          onNome={setNomeCampo}
          onCliente={setClienteCampo}
          onClienteUsuario={setClienteUsuarioCampo}
          clientes={clientes}
          aoSalvar={salvarEditar}
          aoCancelar={() => setModalEditar(null)}
          salvando={salvando}
        />
      )}

      {modalExcluir && (
        <Modal titulo="Excluir projeto?" onFechar={() => setModalExcluir(null)}>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--cor-mutado)' }}>
            O projeto <b style={{ color: 'var(--cor-tinta)' }}>{modalExcluir.nome}</b> e todos os seus locais e
            itens serão removidos. Essa ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2 mt-5">
            <Botao variante="fantasma" onClick={() => setModalExcluir(null)}>Cancelar</Botao>
            <Botao variante="perigo" onClick={() => void excluir()} disabled={salvando}>Excluir</Botao>
          </div>
        </Modal>
      )}
    </AppShell>
  )
}
