import { useEffect, useState } from 'react'
import {
  atualizarAgendamento,
  criarAgendamento,
  deletarAgendamento,
  listarAgendamentos,
} from '../lib/api'
import type { Agendamento, Publicacao } from '../lib/types'
import Modal from './ui/Modal'
import Botao from './ui/Botao'

interface Props {
  publicacaoAtual: Publicacao | null
  aoFechar: () => void
}

const PERIODICIDADES: { value: Agendamento['periodicidade']; label: string }[] = [
  { value: 'diaria', label: 'Diária' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'on_demand', label: 'Sob demanda' },
]

export default function ScheduleDialog({ publicacaoAtual, aoFechar }: Props) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [periodicidade, setPeriodicidade] = useState<Agendamento['periodicidade']>('diaria')
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    listarAgendamentos()
      .then((lista) => {
        if (ativo) setAgendamentos(lista)
      })
      .catch(() => {
        if (ativo) setAgendamentos([])
      })
    return () => {
      ativo = false
    }
  }, [])

  async function criar() {
    if (!publicacaoAtual) return
    setCriando(true)
    setErro('')
    try {
      await criarAgendamento(publicacaoAtual.id, periodicidade)
      setAgendamentos(await listarAgendamentos())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar agendamento.')
    } finally {
      setCriando(false)
    }
  }

  async function alternar(aid: number, ativo: boolean) {
    setErro('')
    try {
      await atualizarAgendamento(aid, { ativo })
      setAgendamentos(await listarAgendamentos())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao atualizar agendamento.')
    }
  }

  async function excluir(aid: number) {
    setErro('')
    try {
      await deletarAgendamento(aid)
      setAgendamentos(await listarAgendamentos())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir agendamento.')
    }
  }

  const inputStyle = {
    borderColor: 'var(--cor-borda)',
    background: 'var(--cor-elevado)',
    color: 'var(--cor-tinta)',
  }

  return (
    <Modal titulo="Agendar relatório" onFechar={aoFechar}>
      {!publicacaoAtual ? (
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--cor-mutado)' }}>
          Publique o dashboard primeiro (botão “Publicar”) para poder agendar relatórios.
        </p>
      ) : (
        <>
          <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--cor-mutado)' }}>
            Gere relatórios em PDF periodicamente para a publicação #{publicacaoAtual.id}.
          </p>
          {erro && <div className="text-sm mb-3" style={{ color: 'var(--cor-alerta)' }}>{erro}</div>}
          <label className="block text-[12px] mb-1.5" style={{ color: 'var(--cor-mutado)' }}>Periodicidade</label>
          <select
            value={periodicidade}
            onChange={(e) => setPeriodicidade(e.target.value as Agendamento['periodicidade'])}
            className="w-full rounded-lg px-3 py-2 text-sm border outline-none mb-3"
            style={inputStyle}
          >
            {PERIODICIDADES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <Botao onClick={() => void criar()} disabled={criando} className="mb-4">
            {criando ? 'Criando…' : 'Criar agendamento'}
          </Botao>

          {agendamentos.length > 0 && (
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--cor-mutado)' }}>
                Agendamentos
              </div>
              <div className="flex flex-col gap-2">
                {agendamentos.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--cor-borda)', background: 'var(--cor-elevado)' }}>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-medium" style={{ color: 'var(--cor-tinta)' }}>
                        {PERIODICIDADES.find((p) => p.value === a.periodicidade)?.label ?? a.periodicidade}
                      </div>
                      <div className="text-[11.5px]" style={{ color: a.ativo ? 'var(--cor-sucesso)' : 'var(--cor-mutado)' }}>
                        {a.ativo ? 'Ativo' : 'Inativo'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => void alternar(a.id, !a.ativo)}
                        className="h-8 px-2.5 rounded-lg text-[12px] font-medium transition-colors"
                        style={{ color: 'var(--cor-mutado)' }}
                      >
                        {a.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => void excluir(a.id)}
                        className="h-8 px-2.5 rounded-lg text-[12px] font-medium transition-colors"
                        style={{ color: 'var(--cor-alerta)' }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <div className="flex justify-end gap-2 mt-5">
        <Botao variante="fantasma" onClick={aoFechar}>Fechar</Botao>
      </div>
    </Modal>
  )
}
