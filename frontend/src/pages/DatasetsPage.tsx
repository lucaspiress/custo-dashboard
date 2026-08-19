import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AgGridReact } from 'ag-grid-react'
import type { CellValueChangedEvent, ColDef } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-quartz.css'
import {
  adicionarLinhas,
  atualizarCampoCalculado,
  criarCampoCalculado,
  criarDataset,
  deletarCampoCalculado,
  deletarDataset,
  exportarDatasetCSV,
  exportarDatasetXLSX,
  importarDataset,
  listarCamposCalculados,
  listarDatasets,
  listarLinhas,
  renomearDataset,
} from '../lib/api'
import { baixarBlob, paraInputDate } from '../lib/format'
import { criarAutosave } from '../lib/autosave'
import type { Autosave, EstadoAutosave } from '../lib/autosave'
import type { CampoCalculado, Dataset, DatasetRow } from '../lib/types'
import AppShell from '../components/AppShell'
import Botao from '../components/ui/Botao'
import Modal from '../components/ui/Modal'

const ICONE_PLANILHA = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /></svg>
)
const ICONE_DASHBOARD = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
)
const ICONE_DATASETS = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
)
const ICONE_UPLOAD = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
)
const ICONE_CSV = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
)
const ICONE_XLSX = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /></svg>
)
const ICONE_LIXO = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
)
const ICONE_MAIS = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
)

/** Converte o schema vindo da API (mapa, lista de {campo, tipo} ou {colunas, tipos}) em Record<string, string>. */
function normalizarSchema(schema: unknown): Record<string, string> {
  if (!schema) return {}
  if (Array.isArray(schema)) {
    // lista de {campo, tipo}
    const out: Record<string, string> = {}
    for (const item of schema) {
      if (item && typeof item === 'object' && 'campo' in item) {
        const obj = item as Record<string, unknown>
        out[String(obj.campo)] = String(obj.tipo ?? 'text')
      }
    }
    return out
  }
  if (typeof schema === 'object') {
    const obj = schema as Record<string, unknown>
    // {colunas: string[], tipos: {coluna: tipo}} (formato gravado pelo import)
    if (Array.isArray(obj.colunas) && obj.tipos && typeof obj.tipos === 'object') {
      const tipos = obj.tipos as Record<string, unknown>
      const out: Record<string, string> = {}
      for (const c of obj.colunas) {
        const nome = String(c)
        out[nome] = typeof tipos[nome] === 'string' ? String(tipos[nome]) : 'text'
      }
      return out
    }
    // {colunas: [{campo, tipo}]}
    if (Array.isArray(obj.colunas)) return normalizarSchema(obj.colunas)
    // mapa direto {coluna: tipo}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(obj)) out[k] = typeof v === 'string' ? v : 'text'
    return out
  }
  return {}
}

function fmtDataLocal(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  return iso
}

const FUNCOES_FORMULA = [
  'SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'IF', 'CONCAT', 'DATE', 'SUMIF', 'COUNTIF', 'AND', 'OR', 'NOT',
]

/** Validação client-side leve da fórmula (o parser completo roda no backend). */
function validarFormula(formula: string, colunasValidas: string[]): { ok: boolean; msg: string } {
  if (!formula.trim()) return { ok: false, msg: 'Fórmula vazia.' }
  if (formula.length > 500) return { ok: false, msg: 'Fórmula muito longa (máx 500 caracteres).' }
  if ([';', '[', ']', '{', '}'].some((ch) => formula.includes(ch))) {
    return { ok: false, msg: 'Caracteres inválidos na fórmula.' }
  }
  const tokens = formula.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []
  const invalidos = tokens.filter(
    (t) => !FUNCOES_FORMULA.includes(t.toUpperCase()) && !colunasValidas.includes(t)
  )
  if (invalidos.length > 0) return { ok: false, msg: `Identificadores desconhecidos: ${invalidos.join(', ')}` }
  return { ok: true, msg: 'Fórmula válida.' }
}

interface DateEditorProps {
  value: string | null | undefined
  stopEditing: (suppressNavigateAfterEdit?: boolean) => void
}

const DateCellEditor = forwardRef<{ getValue: () => string | null }, DateEditorProps>(
  function DateCellEditor(props, ref) {
    const [valor, setValor] = useState(() => paraInputDate(props.value) || '')
    useImperativeHandle(ref, () => ({
      getValue: () => valor || null,
    }))
    return (
      <input
        type="date"
        autoFocus
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') props.stopEditing()
        }}
        className="w-full h-full px-1.5 text-[13px] bg-transparent outline-none"
        style={{ color: 'var(--cor-tinta)' }}
      />
    )
  }
)

function ModalNovoDataset({
  aoSalvar,
  aoCancelar,
  salvando,
}: {
  aoSalvar: (nome: string, schema: Record<string, string>) => void
  aoCancelar: () => void
  salvando: boolean
}) {
  const [nome, setNome] = useState('')
  const [colunas, setColunas] = useState<Array<{ campo: string; tipo: string }>>([{ campo: '', tipo: 'text' }])

  function adicionarColuna() {
    setColunas((atual) => [...atual, { campo: '', tipo: 'text' }])
  }
  function removerColuna(idx: number) {
    setColunas((atual) => atual.filter((_, i) => i !== idx))
  }
  function alterar(idx: number, campo: 'campo' | 'tipo', valor: string) {
    setColunas((atual) => atual.map((c, i) => (i === idx ? { ...c, [campo]: valor } : c)))
  }
  function salvar() {
    const schema: Record<string, string> = {}
    for (const c of colunas) {
      const campo = c.campo.trim()
      if (campo) schema[campo] = c.tipo
    }
    aoSalvar(nome.trim(), schema)
  }

  return (
    <Modal titulo="Novo dataset" onFechar={aoCancelar}>
      <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Nome do dataset</label>
      <input
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void salvar()}
        placeholder="Ex.: Vendas 2026"
        className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-4"
        style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-elevado)', color: 'var(--cor-tinta)' }}
      />
      <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Colunas</label>
      {colunas.map((c, i) => (
        <div key={i} className="flex items-center gap-2 mb-2">
          <input
            value={c.campo}
            onChange={(e) => alterar(i, 'campo', e.target.value)}
            placeholder="Nome da coluna"
            className="flex-1 rounded-lg px-3 py-2 text-sm border outline-none"
            style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-elevado)', color: 'var(--cor-tinta)' }}
          />
          <select
            value={c.tipo}
            onChange={(e) => alterar(i, 'tipo', e.target.value)}
            className="rounded-lg px-2 py-2 text-sm border outline-none"
            style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-elevado)', color: 'var(--cor-tinta)' }}
          >
            <option value="text">Texto</option>
            <option value="number">Número</option>
            <option value="date">Data</option>
          </select>
          <button
            onClick={() => removerColuna(i)}
            title="Remover coluna"
            className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-[16px] transition-colors"
            style={{ color: 'var(--cor-mutado)' }}
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={adicionarColuna}
        className="h-8 px-3 rounded-lg text-[12.5px] font-medium inline-flex items-center gap-1.5 transition-colors"
        style={{ color: 'var(--cor-primaria)' }}
      >
        {ICONE_MAIS}
        Adicionar coluna
      </button>
      <div className="flex justify-end gap-2 mt-5">
        <Botao variante="fantasma" onClick={aoCancelar}>Cancelar</Botao>
        <Botao onClick={() => void salvar()} disabled={salvando || !nome.trim()}>Criar</Botao>
      </div>
    </Modal>
  )
}

function ModalCampoCalculado({
  colunasValidas,
  campo,
  aoSalvar,
  aoCancelar,
}: {
  colunasValidas: string[]
  campo?: CampoCalculado
  aoSalvar: (nome: string, formula: string) => void
  aoCancelar: () => void
}) {
  const [nome, setNome] = useState(campo?.nome ?? '')
  const [formula, setFormula] = useState(campo?.formula ?? '')
  const [preview, setPreview] = useState<{ ok: boolean; msg: string } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function inserirColuna(coluna: string) {
    const el = textareaRef.current
    if (!el) {
      setFormula((f) => (f ? `${f} ${coluna}` : coluna))
      return
    }
    const inicio = el.selectionStart ?? formula.length
    const fim = el.selectionEnd ?? formula.length
    const nova = formula.slice(0, inicio) + coluna + formula.slice(fim)
    setFormula(nova)
    requestAnimationFrame(() => {
      el.focus()
      const pos = inicio + coluna.length
      el.setSelectionRange(pos, pos)
    })
  }

  function testar() {
    setPreview(validarFormula(formula, colunasValidas))
  }

  const inputStyle = {
    borderColor: 'var(--cor-borda)',
    background: 'var(--cor-elevado)',
    color: 'var(--cor-tinta)',
  }

  return (
    <Modal titulo={campo ? 'Editar campo calculado' : 'Novo campo calculado'} onFechar={aoCancelar}>
      <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Nome</label>
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Ex.: valor_total"
        className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3"
        style={inputStyle}
      />
      <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Fórmula</label>
      <textarea
        ref={textareaRef}
        value={formula}
        onChange={(e) => setFormula(e.target.value)}
        rows={3}
        placeholder="Ex.: quantidade * custo_unitario"
        className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-2 font-mono"
        style={inputStyle}
      />
      <div className="flex flex-wrap gap-1.5 mb-3">
        {colunasValidas.map((c) => (
          <button
            key={c}
            onClick={() => inserirColuna(c)}
            className="h-6 px-2 rounded-md text-[11px] font-medium transition-colors"
            style={{ background: 'var(--cor-elevado)', color: 'var(--cor-mutado)', border: '1px solid var(--cor-borda)' }}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Botao variante="secundario" onClick={testar}>Testar</Botao>
        {preview && (
          <span className="text-[12px]" style={{ color: preview.ok ? 'var(--cor-sucesso)' : 'var(--cor-alerta)' }}>
            {preview.msg}
          </span>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Botao variante="fantasma" onClick={aoCancelar}>Cancelar</Botao>
        <Botao onClick={() => void aoSalvar(nome.trim(), formula.trim())} disabled={!nome.trim() || !formula.trim()}>
          Salvar
        </Botao>
      </div>
    </Modal>
  )
}

export default function DatasetsPage() {
  const { id, did } = useParams<{ id: string; did?: string }>()
  const navigate = useNavigate()
  const projetoId = Number(id)

  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [linhas, setLinhas] = useState<DatasetRow[]>([])
  const [carregandoDatasets, setCarregandoDatasets] = useState(true)
  const [carregandoLinhas, setCarregandoLinhas] = useState(false)
  const [erro, setErro] = useState('')
  const [modalNovo, setModalNovo] = useState(false)
  const [confirmarExcluir, setConfirmarExcluir] = useState(false)
  const [estadoAutosave, setEstadoAutosave] = useState<EstadoAutosave>('salvo')
  const [importando, setImportando] = useState(false)
  const [nomeEditando, setNomeEditando] = useState<string | null>(null)
  const [camposCalculados, setCamposCalculados] = useState<CampoCalculado[]>([])
  const [modalCampo, setModalCampo] = useState<{ modo: 'novo' | 'editar'; campo?: CampoCalculado } | null>(null)

  const didRef = useRef(did)
  didRef.current = did
  const linhasRef = useRef(linhas)
  linhasRef.current = linhas
  const pendentesRef = useRef<Map<number, Record<string, any>>>(new Map())
  const autosaveRef = useRef<Autosave<{ did: string; rows: DatasetRow[] }> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!autosaveRef.current) {
    autosaveRef.current = criarAutosave(async (payload) => {
      await adicionarLinhas(payload.did, payload.rows)
      for (const { row_index: ri, data_json: dj } of payload.rows) {
        if (pendentesRef.current.get(ri) === dj) pendentesRef.current.delete(ri)
      }
    }, setEstadoAutosave)
  }

  const datasetSelecionado = useMemo(
    () => datasets.find((d) => d.id === did) ?? null,
    [datasets, did]
  )
  const readOnly = datasetSelecionado?.fonte !== 'livre'
  const schema = useMemo(() => normalizarSchema(datasetSelecionado?.schema_json), [datasetSelecionado])
  const linhasPlanas = useMemo(
    () => linhas.map((r) => ({ row_index: r.row_index, ...r.data_json })),
    [linhas]
  )
  const colunasValidas = useMemo(() => {
    const cols = Object.keys(schema)
    const campos = camposCalculados.map((c) => c.nome)
    return [...new Set([...cols, ...campos])]
  }, [schema, camposCalculados])

  useEffect(() => {
    let ativo = true
    setCarregandoDatasets(true)
    setErro('')
    listarDatasets(projetoId)
      .then((dados) => {
        if (ativo) setDatasets(dados)
      })
      .catch((e) => {
        if (ativo) setErro(e instanceof Error ? e.message : 'Erro ao carregar datasets.')
      })
      .finally(() => {
        if (ativo) setCarregandoDatasets(false)
      })
    return () => {
      ativo = false
    }
  }, [projetoId])

  useEffect(() => {
    autosaveRef.current?.cancelar()
    pendentesRef.current.clear()
    setLinhas([])
    setCamposCalculados([])
    if (!did) return
    let ativo = true
    setCarregandoLinhas(true)
    setErro('')
    listarLinhas(did)
      .then((rows) => {
        if (ativo) setLinhas(rows)
      })
      .catch((e) => {
        if (ativo) setErro(e instanceof Error ? e.message : 'Erro ao carregar linhas.')
      })
      .finally(() => {
        if (ativo) setCarregandoLinhas(false)
      })
    if (/^\d+$/.test(did)) {
      listarCamposCalculados(Number(did))
        .then((campos) => {
          if (ativo) setCamposCalculados(campos)
        })
        .catch(() => {
          if (ativo) setCamposCalculados([])
        })
    }
    return () => {
      ativo = false
    }
  }, [did])

  useEffect(() => () => autosaveRef.current?.cancelar(), [])

  const colunas = useMemo<ColDef[]>(
    () =>
      Object.entries(schema).map(([campo, tipo]) => ({
        field: campo,
        headerName: campo,
        editable: !readOnly,
        cellEditor:
          tipo === 'number' ? 'agNumberCellEditor' : tipo === 'date' ? 'dateCellEditor' : 'agTextCellEditor',
        valueFormatter:
          tipo === 'date'
            ? (p) => (p.value == null || p.value === '' ? '' : fmtDataLocal(String(p.value)))
            : undefined,
        minWidth: 120,
      })),
    [schema, readOnly]
  )

  function aoAlterarCelula(evento: CellValueChangedEvent) {
    const rowIndex = evento.data?.row_index as number | undefined
    const campo = evento.colDef.field as string | undefined
    if (rowIndex === undefined || !campo) return
    const novoValor = evento.newValue
    setLinhas((atual) =>
      atual.map((r) => (r.row_index === rowIndex ? { ...r, data_json: { ...r.data_json, [campo]: novoValor } } : r))
    )
    const atual = linhasRef.current.find((r) => r.row_index === rowIndex)
    pendentesRef.current.set(rowIndex, { ...(atual?.data_json ?? {}), [campo]: novoValor })
    const didAtual = didRef.current
    if (!didAtual) return
    const rows = [...pendentesRef.current.entries()].map(([ri, dj]) => ({ row_index: ri, data_json: dj }))
    autosaveRef.current?.agendar('linhas', { did: didAtual, rows })
  }

  async function salvarNome() {
    if (!datasetSelecionado || readOnly) {
      setNomeEditando(null)
      return
    }
    const novo = (nomeEditando ?? datasetSelecionado.nome).trim()
    setNomeEditando(null)
    if (!novo || novo === datasetSelecionado.nome) return
    try {
      const atualizado = await renomearDataset(projetoId, datasetSelecionado.id, novo)
      setDatasets((atual) => atual.map((d) => (d.id === atualizado.id ? { ...d, nome: atualizado.nome } : d)))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao renomear dataset.')
    }
  }

  async function importarArquivo(file: File) {
    if (!datasetSelecionado || readOnly) return
    if (file.size > 10 * 1024 * 1024) {
      setErro('Arquivo muito grande. O limite é de 10MB.')
      return
    }
    setImportando(true)
    setErro('')
    try {
      await importarDataset(datasetSelecionado.id, file)
      // o backend atualiza o schema_json do dataset; recarrega lista + linhas
      const [dados, rows] = await Promise.all([
        listarDatasets(projetoId),
        listarLinhas(datasetSelecionado.id),
      ])
      setDatasets(dados)
      setLinhas(rows)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao importar arquivo.')
    } finally {
      setImportando(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function exportarCSV() {
    if (!datasetSelecionado) return
    try {
      const blob = await exportarDatasetCSV(datasetSelecionado.id)
      baixarBlob(blob, `${datasetSelecionado.nome}.csv`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao exportar CSV.')
    }
  }

  async function exportarXLSX() {
    if (!datasetSelecionado) return
    try {
      const blob = await exportarDatasetXLSX(datasetSelecionado.id)
      baixarBlob(blob, `${datasetSelecionado.nome}.xlsx`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao exportar XLSX.')
    }
  }

  function adicionarLinha() {
    if (!datasetSelecionado || readOnly) return
    const novoIndex = linhas.reduce((max, r) => Math.max(max, r.row_index), -1) + 1
    const dataJson: Record<string, any> = {}
    for (const campo of Object.keys(schema)) dataJson[campo] = null
    const nova: DatasetRow = { row_index: novoIndex, data_json: dataJson }
    setLinhas((atual) => [...atual, nova])
    pendentesRef.current.set(novoIndex, dataJson)
    const didAtual = didRef.current
    if (didAtual) {
      const rows = [...pendentesRef.current.entries()].map(([ri, dj]) => ({ row_index: ri, data_json: dj }))
      autosaveRef.current?.agendar('linhas', { did: didAtual, rows })
    }
  }

  async function excluir() {
    if (!datasetSelecionado || readOnly) return
    setConfirmarExcluir(false)
    setErro('')
    try {
      await deletarDataset(projetoId, datasetSelecionado.id)
      setDatasets((atual) => atual.filter((d) => d.id !== datasetSelecionado.id))
      navigate(`/projetos/${projetoId}/datasets`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir dataset.')
    }
  }

  async function salvarNovo(nome: string, schemaNovo: Record<string, string>) {
    setModalNovo(false)
    setErro('')
    try {
      const criado = await criarDataset(projetoId, nome, schemaNovo)
      setDatasets((atual) => [...atual, criado])
      navigate(`/projetos/${projetoId}/datasets/${criado.id}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar dataset.')
    }
  }

  async function salvarCampo(nome: string, formula: string) {
    if (!datasetSelecionado || readOnly) return
    const didNum = Number(datasetSelecionado.id)
    setErro('')
    try {
      if (modalCampo?.modo === 'editar' && modalCampo.campo) {
        await atualizarCampoCalculado(didNum, modalCampo.campo.id, { nome, formula })
      } else {
        await criarCampoCalculado(didNum, nome, formula)
      }
      setModalCampo(null)
      setCamposCalculados(await listarCamposCalculados(didNum))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar campo calculado.')
    }
  }

  async function excluirCampo(cid: number) {
    if (!datasetSelecionado || readOnly) return
    setErro('')
    try {
      await deletarCampoCalculado(Number(datasetSelecionado.id), cid)
      setCamposCalculados((atual) => atual.filter((c) => c.id !== cid))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir campo calculado.')
    }
  }

  return (
    <AppShell
      titulo="Datasets"
      acoes={
        <div
          className="inline-flex rounded-lg p-0.5 border"
          style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-elevado)' }}
          role="tablist"
          aria-label="Visualização do projeto"
        >
          <Link
            to={`/projetos/${projetoId}/planilha`}
            role="tab"
            aria-selected="false"
            className="h-8 px-3 rounded-md text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors hover:text-tinta"
            style={{ color: 'var(--cor-mutado)' }}
          >
            {ICONE_PLANILHA}
            Planilha
          </Link>
          <Link
            to={`/projetos/${projetoId}/dashboard`}
            role="tab"
            aria-selected="false"
            className="h-8 px-3 rounded-md text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors hover:text-tinta"
            style={{ color: 'var(--cor-mutado)' }}
          >
            {ICONE_DASHBOARD}
            Dashboard
          </Link>
          <Link
            to={`/projetos/${projetoId}/datasets`}
            role="tab"
            aria-selected="true"
            className="h-8 px-3 rounded-md text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors"
            style={{ background: 'var(--cor-superficie)', color: 'var(--cor-tinta)', border: '1px solid var(--cor-borda)' }}
          >
            {ICONE_DATASETS}
            Datasets
          </Link>
        </div>
      }
    >
      <div className="flex flex-col lg:flex-row gap-5">
        <aside
          className="w-full lg:w-72 shrink-0 rounded-2xl border p-3 self-start"
          style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}
        >
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--cor-mutado)' }}>
              Datasets
            </span>
            <button
              onClick={() => setModalNovo(true)}
              title="Novo dataset"
              className="h-7 w-7 rounded-lg inline-flex items-center justify-center transition-colors"
              style={{ background: 'var(--cor-elevado)', color: 'var(--cor-tinta)', border: '1px solid var(--cor-borda)' }}
            >
              {ICONE_MAIS}
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {carregandoDatasets && (
              <div className="text-[12.5px] px-1 py-2" style={{ color: 'var(--cor-mutado)' }}>Carregando…</div>
            )}
            {!carregandoDatasets && datasets.length === 0 && (
              <div className="text-[12.5px] px-1 py-2" style={{ color: 'var(--cor-mutado)' }}>
                Nenhum dataset. Clique em “+” para criar.
              </div>
            )}
            {datasets.map((d) => {
              const selecionado = d.id === did
              return (
                <button
                  key={d.id}
                  onClick={() => navigate(`/projetos/${projetoId}/datasets/${d.id}`)}
                  className="text-left rounded-lg px-3 py-2.5 transition-colors"
                  style={
                    selecionado
                      ? { background: 'rgba(46, 89, 246, 0.14)', border: '1px solid rgba(46, 89, 246, 0.4)' }
                      : { background: 'transparent', border: '1px solid transparent' }
                  }
                >
                  <div className="text-[13px] font-medium truncate" style={{ color: 'var(--cor-tinta)' }}>
                    {d.nome}
                  </div>
                  <div className="text-[11.5px] mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--cor-mutado)' }}>
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: d.fonte === 'livre' ? 'var(--cor-sucesso)' : 'var(--cor-destaque)' }}
                    />
                    {d.fonte === 'livre' ? 'Livre' : 'Read-only'}
                    <span>·</span>
                    <span>{selecionado ? linhas.length : '—'} linhas</span>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {!datasetSelecionado ? (
            <div
              className="rounded-2xl border p-10 text-center"
              style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}
            >
              <div className="text-[15px] font-semibold mb-1.5" style={{ color: 'var(--cor-tinta)' }}>
                Selecione um dataset
              </div>
              <div className="text-[13px]" style={{ color: 'var(--cor-mutado)' }}>
                Escolha um dataset na lista ao lado para visualizar e editar os dados.
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <input
                  value={nomeEditando ?? datasetSelecionado.nome}
                  onChange={(e) => setNomeEditando(e.target.value)}
                  onBlur={() => void salvarNome()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  }}
                  disabled={readOnly}
                  title={readOnly ? 'Dataset virtual — somente leitura' : 'Clique para renomear'}
                  className="rounded-lg px-3 py-2 text-[15px] font-semibold border outline-none min-w-0 flex-1 sm:flex-none"
                  style={{
                    borderColor: 'var(--cor-borda)',
                    background: 'var(--cor-elevado)',
                    color: 'var(--cor-tinta)',
                  }}
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void importarArquivo(file)
                  }}
                />
                {!readOnly && (
                  <Botao variante="secundario" onClick={() => fileRef.current?.click()} disabled={importando}>
                    {ICONE_UPLOAD}
                    {importando ? 'Importando…' : 'Importar CSV/XLSX'}
                  </Botao>
                )}
                <Botao variante="secundario" onClick={() => void exportarCSV()}>
                  {ICONE_CSV}
                  Exportar CSV
                </Botao>
                <Botao variante="secundario" onClick={() => void exportarXLSX()}>
                  {ICONE_XLSX}
                  Exportar XLSX
                </Botao>
                {!readOnly && (
                  <>
                    <Botao variante="secundario" onClick={adicionarLinha}>
                      {ICONE_MAIS}
                      Linha
                    </Botao>
                    <button
                      onClick={() => setConfirmarExcluir(true)}
                      title="Excluir dataset"
                      className="h-9 w-9 rounded-lg inline-flex items-center justify-center transition-colors"
                      style={{ color: 'var(--cor-mutado)' }}
                    >
                      {ICONE_LIXO}
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 mb-3 text-[12px]" aria-live="polite">
                {readOnly && (
                  <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium" style={{ background: 'rgba(224,123,26,0.12)', color: 'var(--cor-destaque)' }}>
                    Dataset virtual — somente leitura
                  </span>
                )}
                {estadoAutosave === 'pendente' && <span style={{ color: 'var(--cor-mutado)' }}>Alteração pendente…</span>}
                {estadoAutosave === 'salvando' && <span style={{ color: 'var(--cor-primaria)' }}>Salvando alterações…</span>}
                {estadoAutosave === 'salvo' && !readOnly && <span style={{ color: 'var(--cor-sucesso)' }}>Alterações salvas</span>}
                {estadoAutosave === 'erro' && <span style={{ color: 'var(--cor-alerta)' }}>Erro ao salvar alterações.</span>}
              </div>

              {erro && <div className="text-sm mb-3" style={{ color: 'var(--cor-alerta)' }}>{erro}</div>}

              <div
                className="rounded-2xl border overflow-hidden"
                style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}
              >
                {carregandoLinhas ? (
                  <div className="p-10 text-center text-[13px]" style={{ color: 'var(--cor-mutado)' }}>Carregando linhas…</div>
                ) : (
                  <div className="ag-theme-quartz-dark" style={{ height: '62vh', width: '100%' }}>
                    <AgGridReact
                      rowData={linhasPlanas}
                      columnDefs={colunas}
                      defaultColDef={{ resizable: true, sortable: true }}
                      getRowId={(params) => String(params.data.row_index)}
                      onCellValueChanged={aoAlterarCelula}
                      components={{ dateCellEditor: DateCellEditor }}
                    />
                  </div>
                )}
              </div>

              {!readOnly && (
                <div
                  className="mt-5 rounded-2xl border p-4"
                  style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--cor-mutado)' }}>
                      Campos Calculados
                    </span>
                    <Botao variante="secundario" onClick={() => setModalCampo({ modo: 'novo' })}>
                      {ICONE_MAIS}
                      Novo campo calculado
                    </Botao>
                  </div>
                  {camposCalculados.length === 0 ? (
                    <div className="text-[12.5px]" style={{ color: 'var(--cor-mutado)' }}>
                      Nenhum campo calculado. Crie fórmulas como <code className="font-mono">quantidade * custo_unitario</code>.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {camposCalculados.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                          style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-elevado)' }}
                        >
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium" style={{ color: 'var(--cor-tinta)' }}>{c.nome}</div>
                            <div className="text-[12px] font-mono truncate" style={{ color: 'var(--cor-mutado)' }}>{c.formula}</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setModalCampo({ modo: 'editar', campo: c })}
                              className="h-8 px-2.5 rounded-lg text-[12px] font-medium transition-colors"
                              style={{ color: 'var(--cor-mutado)' }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => void excluirCampo(c.id)}
                              className="h-8 px-2.5 rounded-lg text-[12px] font-medium transition-colors"
                              style={{ color: 'var(--cor-alerta)' }}
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modalNovo && (
        <ModalNovoDataset
          aoSalvar={(nome, schemaNovo) => void salvarNovo(nome, schemaNovo)}
          aoCancelar={() => setModalNovo(false)}
          salvando={false}
        />
      )}

      {confirmarExcluir && datasetSelecionado && (
        <Modal titulo="Excluir dataset?" onFechar={() => setConfirmarExcluir(false)}>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--cor-mutado)' }}>
            O dataset <b style={{ color: 'var(--cor-tinta)' }}>{datasetSelecionado.nome}</b> e todas as suas linhas
            serão removidos. Essa ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2 mt-5">
            <Botao variante="fantasma" onClick={() => setConfirmarExcluir(false)}>Cancelar</Botao>
            <Botao variante="perigo" onClick={() => void excluir()}>Excluir</Botao>
          </div>
        </Modal>
      )}

      {modalCampo && (
        <ModalCampoCalculado
          colunasValidas={colunasValidas}
          campo={modalCampo.campo}
          aoSalvar={(nome, formula) => void salvarCampo(nome, formula)}
          aoCancelar={() => setModalCampo(null)}
        />
      )}
    </AppShell>
  )
}
