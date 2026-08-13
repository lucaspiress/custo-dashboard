import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { criarAutosave, type Autosave, type EstadoAutosave } from '../lib/autosave'
import { baixarBlob, fmtMoeda, fmtNumero, paraInputDate, parseNumero } from '../lib/format'
import type { AnaliseUpload, ItemLinha } from '../lib/types'
import { PlanilhaCarregando } from '../components/ProjetoLoading'

interface LinhaLocal {
  id: number
  nome: string
  valor_mensal: number
  taxa_instalacao: number
  custo_manutencao: number
  mensal_terceirizada: number
  chip_mensal: number
  custos_softwares: number
  mao_de_obra: number
  data_inst: string | null
  itens: ItemLinha[]
  expanso: boolean
}

interface ComputadoLocal {
  saldoMensal: number
  equipamento: number
  investimento: number
  retorno: number | null
  numItens: number
}

function computarLocal(local: LinhaLocal): ComputadoLocal {
  const impostos = local.valor_mensal * 0.15
  const saldoApos = local.valor_mensal - impostos
  const custosFixos =
    local.custo_manutencao + local.mensal_terceirizada + local.chip_mensal + local.custos_softwares
  const saldoMensal = saldoApos - custosFixos
  const equipamento = local.itens.reduce((soma, item) => soma + (item.valor_total || 0), 0)
  const investimento = local.mao_de_obra + equipamento
  const retorno = saldoMensal > 0 ? (investimento - local.taxa_instalacao) / saldoMensal : null
  return { saldoMensal, equipamento, investimento, retorno, numItens: local.itens.length }
}

const CABECALHO_LOCAL = [
  'Local', 'Valor mensal', 'Taxa instalação', 'Custo manutenção', 'Mensal terceirizada',
  'Chip mensal', 'Custos softwares', 'Mão de obra', 'Data instalação', 'Saldo mensal',
  'Investimento', 'Retorno', '',
]

const CABECALHO_ITEM = ['Categoria', 'Código', 'Material', 'Qtd', 'Valor unit.', 'Valor total', '']

const ICONE_VOLTAR = (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>)
const ICONE_LIXO = (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>)
const ICONE_PDF = (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>)
const ICONE_XLSX = (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /></svg>)
const ICONE_CHEVRON = (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>)

function fmtDataLocal(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  if (!ano || !mes || !dia) return iso
  return `${dia}/${mes}/${ano}`
}

function MoneyCell({ valor, onCommit }: { valor: number; onCommit: (n: number | null) => void }) {
  const [focado, setFocado] = useState(false)
  const [texto, setTexto] = useState('')

  function focar() {
    setTexto(valor === 0 ? '' : String(valor))
    setFocado(true)
  }

  function confirmar() {
    const numero = parseNumero(texto)
    setFocado(false)
    if (numero === null) return
    if (numero !== valor) onCommit(numero)
  }

  if (focado) {
    return (
      <input
        autoFocus
        autoComplete="off"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="w-full min-w-[92px] rounded px-1.5 py-1 text-[13px] bg-elevado text-tinta outline-none ring-1 ring-[#10a0a0] text-right"
      />
    )
  }
  return (
    <div
      onClick={focar}
      title="Clique para editar (aceita 1234,56 ou 1234.56)"
      className="px-1.5 py-1 text-[13px] text-tinta cursor-text hover:bg-elevado rounded min-w-[92px] text-right tabular-nums"
    >
      {fmtMoeda(valor)}
    </div>
  )
}

function QtdCell({ valor, onCommit }: { valor: number; onCommit: (n: number | null) => void }) {
  const [focado, setFocado] = useState(false)
  const [texto, setTexto] = useState('')

  function focar() {
    setTexto(valor === 0 ? '' : String(valor))
    setFocado(true)
  }

  function confirmar() {
    const numero = parseNumero(texto)
    setFocado(false)
    if (numero === null) return
    if (numero !== valor) onCommit(numero)
  }

  if (focado) {
    return (
      <input
        autoFocus
        autoComplete="off"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="w-full min-w-[60px] rounded px-1.5 py-1 text-[13px] bg-elevado text-tinta outline-none ring-1 ring-[#10a0a0] text-right"
      />
    )
  }
  return (
    <div
      onClick={focar}
      className="px-1.5 py-1 text-[13px] text-tinta cursor-text hover:bg-elevado rounded min-w-[60px] text-right tabular-nums"
    >
      {fmtNumero(valor, 3).replace(/,?0+$/, '') || '0'}
    </div>
  )
}

function TextCell({ valor, onCommit, placeholder = '' }: { valor: string; onCommit: (v: string) => void; placeholder?: string }) {
  const [focado, setFocado] = useState(false)
  const [texto, setTexto] = useState('')

  function focar() {
    setTexto(valor)
    setFocado(true)
  }

  function confirmar() {
    const novo = texto
    setFocado(false)
    if (novo !== valor) onCommit(novo)
  }

  if (focado) {
    return (
      <input
        autoFocus
        autoComplete="off"
        value={texto}
        placeholder={placeholder}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="w-full rounded px-1.5 py-1 text-[13px] bg-elevado text-tinta outline-none ring-1 ring-[#10a0a0]"
      />
    )
  }
  return (
    <div
      onClick={focar}
      className="px-1.5 py-1 text-[13px] text-tinta cursor-text hover:bg-elevado rounded min-w-[70px] truncate"
    >
      {valor || <span className="text-mutado/60">{placeholder || '—'}</span>}
    </div>
  )
}

function DateCell({ valor, onCommit }: { valor: string | null; onCommit: (v: string | null) => void }) {
  const [focado, setFocado] = useState(false)

  if (focado) {
    return (
      <input
        autoFocus
        type="date"
        defaultValue={paraInputDate(valor) || undefined}
        onBlur={(e) => {
          setFocado(false)
          const v = e.target.value || null
          if (v !== paraInputDate(valor)) onCommit(v)
        }}
        className="w-full rounded px-1.5 py-1 text-[13px] bg-elevado text-tinta outline-none ring-1 ring-[#10a0a0]"
      />
    )
  }
  return (
    <div
      onClick={() => setFocado(true)}
      className="px-1.5 py-1 text-[13px] text-tinta cursor-text hover:bg-elevado rounded min-w-[92px]"
    >
      {paraInputDate(valor) ? fmtDataLocal(paraInputDate(valor)) : <span className="text-mutado/60">—</span>}
    </div>
  )
}

export default function PlanilhaPage() {
  const { id } = useParams<{ id: string }>()
  const projetoId = Number(id)
  const { usuario } = useAuth()
  const [locais, setLocais] = useState<LinhaLocal[]>([])
  const [nomeProjeto, setNomeProjeto] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [estadoAutosave, setEstadoAutosave] = useState<EstadoAutosave>('salvo')
  const [confirmarExcluirLocal, setConfirmarExcluirLocal] = useState<number | null>(null)
  const locaisRef = useRef(locais)
  const autosaveRef = useRef<Autosave<() => Promise<void>> | null>(null)
  locaisRef.current = locais

  if (!autosaveRef.current) {
    autosaveRef.current = criarAutosave(async (salvar) => salvar(), setEstadoAutosave)
  }

  const totais = useMemo(() => {
    const receita = locais.reduce((s, l) => s + l.valor_mensal, 0)
    const saldo = locais.reduce((s, l) => s + computarLocal(l).saldoMensal, 0)
    const investimento = locais.reduce((s, l) => s + computarLocal(l).investimento, 0)
    return { receita, saldo, investimento }
  }, [locais])

  function dePayload(dados: AnaliseUpload): LinhaLocal[] {
    return dados.locais.map((l) => ({
      id: l.id ?? 0,
      nome: l.resumo.local ?? l.nome,
      valor_mensal: l.resumo.valor_mensal,
      taxa_instalacao: l.resumo.taxa_instalacao,
      custo_manutencao: l.resumo.custo_manutencao,
      mensal_terceirizada: l.resumo.mensal_terceirizada,
      chip_mensal: l.resumo.chip_mensal,
      custos_softwares: l.resumo.custos_softwares,
      mao_de_obra: l.resumo.mao_de_obra,
      data_inst: l.resumo.data_inst,
      itens: l.itens.map((i) => ({ ...i, id: i.id ?? 0 })),
      expanso: false,
    }))
  }

  async function carregar() {
    setCarregando(true)
    setErro('')
    try {
      const dados = await api.get<AnaliseUpload>(`/api/projetos/${projetoId}`)
      setNomeProjeto(dados.filename ?? '')
      setLocais(dePayload(dados))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar projeto.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    void carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projetoId])

  useEffect(() => () => autosaveRef.current?.cancelar(), [])

  async function salvarLocal(linha: LinhaLocal, campo: string, valor: unknown) {
    const atualizado = await api.patch<Record<string, unknown>>(
      `/api/projetos/${projetoId}/locais/${linha.id}`,
      { [campo]: valor }
    )
    setLocais((atual) => atual.map((l) => (l.id === linha.id ? { ...l, ...atualizado } : l)))
  }

  async function salvarItem(linha: LinhaLocal, item: ItemLinha, campo: string, valor: unknown) {
    const atualizado = await api.patch<ItemLinha>(`/api/projetos/itens/${item.id}`, { [campo]: valor })
    setLocais((atual) =>
      atual.map((l) =>
        l.id === linha.id
          ? { ...l, itens: l.itens.map((i) => (i.id === item.id ? { ...i, ...atualizado } : i)) }
          : l
      )
    )
  }

  function agendarSalvar(chave: string, salvar: () => Promise<void>) {
    autosaveRef.current?.agendar(chave, salvar)
  }

  function alterarLocal(linha: LinhaLocal, campo: string, valor: unknown) {
    setLocais((atual) => atual.map((l) => (l.id === linha.id ? { ...l, [campo]: valor } : l)))
    agendarSalvar(`local:${linha.id}:${campo}`, () => salvarLocal(linha, campo, valor))
  }

  async function adicionarLocal() {
    setErro('')
    try {
      const criado = await api.post<{ id: number }>(`/api/projetos/${projetoId}/locais`, { nome: 'Novo local' })
      setLocais((atual) => [
        ...atual,
        {
          id: criado.id,
          nome: 'Novo local',
          valor_mensal: 0,
          taxa_instalacao: 0,
          custo_manutencao: 0,
          mensal_terceirizada: 0,
          chip_mensal: 0,
          custos_softwares: 0,
          mao_de_obra: 0,
          data_inst: null,
          itens: [],
          expanso: true,
        },
      ])
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao adicionar local.')
    }
  }

  async function adicionarItem(linha: LinhaLocal) {
    setErro('')
    try {
      const criado = await api.post<ItemLinha>(`/api/projetos/locais/${linha.id}/itens`, {
        categoria: '',
        cod: '',
        material: 'Novo item',
        qtd: 0,
        valor_unit: 0,
      })
      setLocais((atual) => atual.map((l) => (l.id === linha.id ? { ...l, itens: [...l.itens, criado] } : l)))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao adicionar item.')
    }
  }

  async function excluirItem(linha: LinhaLocal, item: ItemLinha) {
    setErro('')
    try {
      await api.delete(`/api/projetos/itens/${item.id}`)
      setLocais((atual) =>
        atual.map((l) => (l.id === linha.id ? { ...l, itens: l.itens.filter((i) => i.id !== item.id) } : l))
      )
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir item.')
    }
  }

  async function excluirLocal(linha: LinhaLocal) {
    setConfirmarExcluirLocal(null)
    setErro('')
    try {
      await api.delete(`/api/projetos/${projetoId}/locais/${linha.id}`)
      setLocais((atual) => atual.filter((l) => l.id !== linha.id))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir local.')
    }
  }

  async function exportarPlanilha() {
    try {
      const blob = await api.blob(`/api/projetos/${projetoId}/planilha.xlsx`)
      baixarBlob(blob, `Planilha_${nomeProjeto || 'Projeto'}.xlsx`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao exportar planilha.')
    }
  }

  async function exportarPdf() {
    try {
      const blob = await api.postBlob(`/api/projetos/${projetoId}/relatorio`, {})
      baixarBlob(blob, `Dashboard_Financeiro_${nomeProjeto || 'Projeto'}.pdf`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar o PDF.')
    }
  }

  async function colarLocais(evento: React.ClipboardEvent) {
    const texto = evento.clipboardData.getData('text')
    if (!texto.trim()) return
    evento.preventDefault()
    const linhas = texto.replace(/\r/g, '').split('\n').filter((l) => l.trim())
    const criadas: LinhaLocal[] = []
    for (const linhaTexto of linhas) {
      const celulas = linhaTexto.split('\t').map((c) => c.trim())
      const nome = celulas[0] ?? ''
      if (!nome || nome.toUpperCase() === 'LOCAL' || nome.toUpperCase() === 'TOTAL') continue
      try {
        const criado = await api.post<{ id: number }>(`/api/projetos/${projetoId}/locais`, {
          nome,
          valor_mensal: parseNumero(celulas[1] ?? '') ?? 0,
          taxa_instalacao: parseNumero(celulas[2] ?? '') ?? 0,
          custo_manutencao: parseNumero(celulas[5] ?? '') ?? 0,
          mensal_terceirizada: parseNumero(celulas[6] ?? '') ?? 0,
          chip_mensal: parseNumero(celulas[7] ?? '') ?? 0,
          custos_softwares: parseNumero(celulas[8] ?? '') ?? 0,
          mao_de_obra: parseNumero(celulas[10] ?? '') ?? 0,
          data_inst: celulas[14] || null,
        })
        criadas.push({
          id: criado.id,
          nome,
          valor_mensal: parseNumero(celulas[1] ?? '') ?? 0,
          taxa_instalacao: parseNumero(celulas[2] ?? '') ?? 0,
          custo_manutencao: parseNumero(celulas[5] ?? '') ?? 0,
          mensal_terceirizada: parseNumero(celulas[6] ?? '') ?? 0,
          chip_mensal: parseNumero(celulas[7] ?? '') ?? 0,
          custos_softwares: parseNumero(celulas[8] ?? '') ?? 0,
          mao_de_obra: parseNumero(celulas[10] ?? '') ?? 0,
          data_inst: celulas[14] || null,
          itens: [],
          expanso: false,
        })
      } catch {
        setErro('Erro ao colar uma linha de local.')
      }
    }
    if (criadas.length > 0) setLocais((atual) => [...atual, ...criadas])
  }

  async function colarItens(linha: LinhaLocal, evento: React.ClipboardEvent) {
    const texto = evento.clipboardData.getData('text')
    if (!texto.trim()) return
    evento.preventDefault()
    const linhas = texto.replace(/\r/g, '').split('\n').filter((l) => l.trim())
    let categoria = ''
    const criados: ItemLinha[] = []
    for (const linhaTexto of linhas) {
      const celulas = linhaTexto.split('\t').map((c) => c.trim())
      const primeiro = celulas[0] ?? ''
      const segundo = celulas[1] ?? ''
      if (primeiro.toUpperCase() === 'TOTAL') continue
      const marcador = segundo.match(/^MATERIAL\s+(.+)$/i)
      if (marcador) {
        categoria = marcador[1].trim()
        continue
      }
      if (!primeiro && !segundo) continue
      const material = segundo || primeiro
      const cod = segundo ? primeiro : ''
      try {
        const criado = await api.post<ItemLinha>(`/api/projetos/locais/${linha.id}/itens`, {
          categoria,
          cod,
          material,
          qtd: parseNumero(celulas[2] ?? '') ?? 0,
          valor_unit: parseNumero(celulas[3] ?? '') ?? 0,
        })
        criados.push(criado)
      } catch {
        setErro('Erro ao colar um item.')
      }
    }
    if (criados.length > 0) {
      setLocais((atual) => atual.map((l) => (l.id === linha.id ? { ...l, itens: [...l.itens, ...criados] } : l)))
    }
  }

  if (carregando) {
    return <PlanilhaCarregando />
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="min-h-[64px] shrink-0 border-b border-[#1a2138] flex items-center justify-between gap-3 px-4 sm:px-5 py-3 z-10"
        style={{ background: '#111e34' }}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <Link
            to="/"
            className="rounded-lg p-2 text-[#93a5c8] hover:text-white hover:bg-[#16243c] transition-colors"
            title="Voltar aos projetos"
          >
            {ICONE_VOLTAR}
          </Link>
          <img src="/logo-sistema.png" alt="Rota Group" className="h-[32px] w-auto object-contain shrink-0" />
          <span className="w-px h-6 bg-[#2a3a56] shrink-0" />
          <span className="titulo-display text-[16px] font-semibold text-white tracking-wide truncate">
            {nomeProjeto || 'Projeto'}
          </span>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => void exportarPdf()}
            aria-label="Relatório PDF"
            className="h-9 rounded-lg px-3.5 text-[13px] font-medium bg-[#16243c] border border-[#2a3a56] text-[#b9c7e4] hover:text-white hover:border-[#10a0a0] transition-colors inline-flex items-center gap-2"
          >
            {ICONE_PDF}
            <span className="hidden sm:inline">Relatório PDF</span>
          </button>
          <button
            onClick={() => void exportarPlanilha()}
            aria-label="Exportar planilha"
            className="h-9 rounded-lg px-3.5 text-[13px] font-medium bg-[#16243c] border border-[#2a3a56] text-[#b9c7e4] hover:text-white hover:border-[#10a0a0] transition-colors inline-flex items-center gap-2"
          >
            {ICONE_XLSX}
            <span className="hidden sm:inline">Exportar planilha</span>
          </button>
          <span className="hidden sm:block w-px h-6 bg-[#2a3a56] shrink-0" />
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0"
            style={{ background: 'rgba(16, 160, 160, 0.15)', color: '#10a0a0' }}
          >
            {usuario?.nome?.[0]?.toUpperCase() ?? 'U'}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div>
            <div className="text-[12.5px] text-mutado mb-1">
              <Link to="/" className="hover:text-[#10a0a0] transition-colors">Projetos</Link>
              <span className="mx-1.5">/</span>
              <span className="text-[#10a0a0] font-medium">{nomeProjeto || 'Projeto'}</span>
            </div>
            <h1 className="text-xl font-bold text-tinta">Planilha de dados</h1>
            <p className="text-[12.5px] text-mutado mt-0.5">
              Clique numa célula para editar · cole linhas direto do Excel · tudo é salvo automaticamente
            </p>
            <div className="mt-1 text-[12px]" aria-live="polite">
              {estadoAutosave === 'pendente' && <span className="text-mutado">Alteração pendente…</span>}
              {estadoAutosave === 'salvando' && <span className="text-[#10a0a0]">Salvando alteração…</span>}
              {estadoAutosave === 'salvo' && <span className="text-[#10b981]">Alterações salvas</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-mutado">Receita mensal</div>
              <div className="text-[15px] font-semibold text-tinta tabular-nums">{fmtMoeda(totais.receita)}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-mutado">Saldo mensal</div>
              <div className="text-[15px] font-semibold text-tinta tabular-nums">{fmtMoeda(totais.saldo)}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-mutado">Investimento</div>
              <div className="text-[15px] font-semibold text-tinta tabular-nums">{fmtMoeda(totais.investimento)}</div>
            </div>
          </div>
        </div>

        {erro && <div className="text-sm text-alerta mb-4">{erro}</div>}
        {estadoAutosave === 'erro' && (
          <div role="alert" className="text-sm text-alerta mb-4 flex items-center gap-3">
            <span>{autosaveRef.current?.erroAtual() ?? 'Erro ao salvar a alteração.'}</span>
            <button
              onClick={() => void autosaveRef.current?.tentarNovamente()}
              className="font-semibold text-[#10a0a0] hover:text-[#48c8c8] transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        <div className="rounded-xl border border-borda bg-superficie overflow-hidden">
          <div className="overflow-x-auto" onPaste={(e) => void colarLocais(e)}>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#1a2138]">
                  {CABECALHO_LOCAL.map((c, i) => (
                    <th
                      key={i}
                      className={`px-2.5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#8fa3c7] whitespace-nowrap ${i > 0 && i < CABECALHO_LOCAL.length - 1 ? 'text-right' : ''}`}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {locais.map((linha) => {
                  const comp = computarLocal(linha)
                  return (
                    <Fragment key={linha.id}>
                      <tr className="border-b border-[#141a2e] group">
                        <td className="px-2.5 py-1.5">
                          <div className="flex items-center gap-1.5 min-w-[150px]">
                            <button
                              onClick={() =>
                                setLocais((atual) =>
                                  atual.map((l) => (l.id === linha.id ? { ...l, expanso: !l.expanso } : l))
                                )
                              }
                              className={`p-1 rounded text-mutado hover:text-white transition-transform ${linha.expanso ? 'rotate-180' : ''}`}
                            >
                              {ICONE_CHEVRON}
                            </button>
                            <div className="flex-1">
                              <TextCell valor={linha.nome} onCommit={(v) => alterarLocal(linha, 'nome', v)} />
                            </div>
                          </div>
                        </td>
                        <td className="px-1 py-1.5 text-right"><MoneyCell valor={linha.valor_mensal} onCommit={(v) => alterarLocal(linha, 'valor_mensal', v ?? 0)} /></td>
                        <td className="px-1 py-1.5 text-right"><MoneyCell valor={linha.taxa_instalacao} onCommit={(v) => alterarLocal(linha, 'taxa_instalacao', v ?? 0)} /></td>
                        <td className="px-1 py-1.5 text-right"><MoneyCell valor={linha.custo_manutencao} onCommit={(v) => alterarLocal(linha, 'custo_manutencao', v ?? 0)} /></td>
                        <td className="px-1 py-1.5 text-right"><MoneyCell valor={linha.mensal_terceirizada} onCommit={(v) => alterarLocal(linha, 'mensal_terceirizada', v ?? 0)} /></td>
                        <td className="px-1 py-1.5 text-right"><MoneyCell valor={linha.chip_mensal} onCommit={(v) => alterarLocal(linha, 'chip_mensal', v ?? 0)} /></td>
                        <td className="px-1 py-1.5 text-right"><MoneyCell valor={linha.custos_softwares} onCommit={(v) => alterarLocal(linha, 'custos_softwares', v ?? 0)} /></td>
                        <td className="px-1 py-1.5 text-right"><MoneyCell valor={linha.mao_de_obra} onCommit={(v) => alterarLocal(linha, 'mao_de_obra', v ?? 0)} /></td>
                        <td className="px-1 py-1.5"><DateCell valor={linha.data_inst} onCommit={(v) => alterarLocal(linha, 'data_inst', v)} /></td>
                        <td className="px-2.5 py-1.5 text-right text-[13px] text-[#10b981] tabular-nums font-medium">{fmtMoeda(comp.saldoMensal)}</td>
                        <td className="px-2.5 py-1.5 text-right text-[13px] text-[#e07b1a] tabular-nums font-medium">{fmtMoeda(comp.investimento)}</td>
                        <td className="px-2.5 py-1.5 text-right text-[13px] text-mutado tabular-nums">
                          {comp.retorno === null ? '—' : `${Math.ceil(comp.retorno)} meses`}
                        </td>
                        <td className="px-2 py-1.5">
                          <button
                            onClick={() => setConfirmarExcluirLocal(linha.id)}
                            title="Excluir local"
                            className="p-1.5 rounded text-mutado hover:text-alerta hover:bg-[rgba(239,68,68,0.1)] transition-colors opacity-0 group-hover:opacity-100"
                          >
                            {ICONE_LIXO}
                          </button>
                        </td>
                      </tr>
                      {linha.expanso && (
                        <tr>
                          <td colSpan={CABECALHO_LOCAL.length} className="px-4 pb-4 bg-[rgba(16,160,160,0.03)]">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[12px] font-semibold uppercase tracking-wider text-[#8fa3c7]">
                                Itens de equipamento · {comp.numItens} item(ns) · {fmtMoeda(comp.equipamento)}
                              </span>
                              <button
                                onClick={() => void adicionarItem(linha)}
                                className="h-7 px-2.5 rounded-md text-[12px] font-medium border border-[#2a3a56] text-[#b9c7e4] hover:text-white hover:border-[#10a0a0] transition-colors"
                              >
                                + Item
                              </button>
                            </div>
                            <div
                              className="rounded-lg border border-[#1a2138] overflow-hidden"
                              onPaste={(e) => void colarItens(linha, e)}
                            >
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="bg-[#0f1526] border-b border-[#1a2138]">
                                    {CABECALHO_ITEM.map((c, i) => (
                                      <th
                                        key={i}
                                        className={`px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#8fa3c7] whitespace-nowrap ${i > 0 && i < CABECALHO_ITEM.length - 1 ? 'text-right' : ''}`}
                                      >
                                        {c}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {linha.itens.map((item) => (
                                    <tr key={item.id} className="border-b border-[#141a2e] group/item">
                                      <td className="px-2.5 py-1 min-w-[120px]"><TextCell valor={item.categoria} onCommit={(v) => agendarSalvar(`item:${item.id}:categoria`, () => salvarItem(linha, item, 'categoria', v))} /></td>
                                      <td className="px-1 py-1 min-w-[80px]"><TextCell valor={item.cod} onCommit={(v) => agendarSalvar(`item:${item.id}:cod`, () => salvarItem(linha, item, 'cod', v))} /></td>
                                      <td className="px-1 py-1 min-w-[160px]"><TextCell valor={item.material} onCommit={(v) => agendarSalvar(`item:${item.id}:material`, () => salvarItem(linha, item, 'material', v))} /></td>
                                      <td className="px-1 py-1 text-right"><QtdCell valor={item.qtd} onCommit={(v) => agendarSalvar(`item:${item.id}:qtd`, () => salvarItem(linha, item, 'qtd', v ?? 0))} /></td>
                                      <td className="px-1 py-1 text-right"><MoneyCell valor={item.valor_unit} onCommit={(v) => agendarSalvar(`item:${item.id}:valor_unit`, () => salvarItem(linha, item, 'valor_unit', v ?? 0))} /></td>
                                      <td className="px-2.5 py-1 text-right text-[13px] text-tinta tabular-nums">{fmtMoeda(item.valor_total)}</td>
                                      <td className="px-2 py-1">
                                        <button
                                          onClick={() => void excluirItem(linha, item)}
                                          title="Excluir item"
                                          className="p-1.5 rounded text-mutado hover:text-alerta hover:bg-[rgba(239,68,68,0.1)] transition-colors opacity-0 group-hover/item:opacity-100"
                                        >
                                          {ICONE_LIXO}
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                  {linha.itens.length === 0 && (
                                    <tr>
                                      <td colSpan={CABECALHO_ITEM.length} className="px-3 py-4 text-[12.5px] text-mutado">
                                        Sem itens — cole linhas do Excel aqui (com “MATERIAL CATEGORIA” para agrupar) ou
                                        clique em “+ Item”.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
                {locais.length === 0 && (
                  <tr>
                    <td colSpan={CABECALHO_LOCAL.length} className="px-4 py-8 text-center text-[13px] text-mutado">
                      Nenhum local cadastrado — cole linhas do Excel aqui (colunas na ordem do template) ou clique em
                      “+ Local”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#1a2138]">
            <button
              onClick={() => void adicionarLocal()}
              className="h-9 rounded-lg px-4 text-[13px] font-semibold text-white inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
              style={{ background: '#0c7d74' }}
            >
              + Local
            </button>
            <Link
              to={`/projetos/${projetoId}`}
              className="h-9 rounded-lg px-4 text-[13px] font-semibold inline-flex items-center gap-2 border border-[#2a3a56] text-[#b9c7e4] hover:text-white hover:border-[#10a0a0] transition-colors"
            >
              Ver dashboard
            </Link>
          </div>
        </div>
      </main>

      {confirmarExcluirLocal !== null &&
        (() => {
          const linha = locaisRef.current.find((l) => l.id === confirmarExcluirLocal)
          if (!linha) return null
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-sm rounded-xl border border-borda bg-superficie p-5 shadow-2xl">
                <div className="text-[15px] font-semibold text-tinta mb-2">Excluir local?</div>
                <p className="text-[13px] text-mutado leading-relaxed">
                  O local <b className="text-tinta">{linha.nome}</b> e seus {linha.itens.length} item(ns) serão
                  removidos.
                </p>
                <div className="flex justify-end gap-2 mt-5">
                  <button
                    onClick={() => setConfirmarExcluirLocal(null)}
                    className="h-9 px-3.5 rounded-lg text-[13px] font-medium text-mutado hover:text-white hover:bg-elevado transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => void excluirLocal(linha)}
                    className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white"
                    style={{ background: '#b42323' }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
    </div>
  )
}
