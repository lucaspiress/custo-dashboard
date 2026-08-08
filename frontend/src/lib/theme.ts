export const COR = {
  primaria: '#10a0a0',
  primariaHover: '#0c8c8c',
  secundaria: '#0050a0',
  destaque: '#e07b1a',
  fundo: '#0b0f1e',
  superficie: '#12172b',
  elevado: '#1a2138',
  sidebar: '#070b18',
  borda: '#232a44',
  mutado: '#8b93a7',
  tinta: '#edf1f7',
  sucesso: '#10b981',
  alerta: '#ef4444',
  dica: '#3b82f6',
  grid: '#232a44',
  ciano: '#2090b0',
  violeta: '#6366f1',
  cinza: '#94a3b8',
  rosa: '#f43f5e',
  azulCla: '#6ba3d7',
  dourado: '#c98f35',
  laranja: '#bc512c',
} as const

export const KPI_CORES: Record<string, string> = {
  'Receita mensal': '#6ba3d7',
  'Receita anual': '#2090b0',
  'Saldo mensal': COR.sucesso,
  'Impostos (15%)': COR.cinza,
  Investimento: COR.destaque,
  Equipamento: COR.ciano,
  'Tempo de retorno': COR.alerta,
  'Instalação': COR.violeta,
}

export const SEVERIDADE: Record<
  string,
  { cor: string; fundo: string; borda: string; rotulo: string }
> = {
  ok: { cor: COR.sucesso, fundo: 'rgba(16, 185, 129, 0.12)', borda: 'rgba(16, 185, 129, 0.35)', rotulo: 'OK' },
  atencao: { cor: COR.destaque, fundo: 'rgba(224, 123, 26, 0.12)', borda: 'rgba(224, 123, 26, 0.35)', rotulo: 'Atenção' },
  alerta: { cor: COR.alerta, fundo: 'rgba(239, 68, 68, 0.12)', borda: 'rgba(239, 68, 68, 0.35)', rotulo: 'Alerta' },
  dica: { cor: COR.dica, fundo: 'rgba(59, 130, 246, 0.12)', borda: 'rgba(59, 130, 246, 0.35)', rotulo: 'Dica' },
}

export const PALETA_GRAFICOS = [
  '#10a0a0', '#2090b0', '#6ba3d7', '#e07b1a', '#10b981',
  '#6366f1', '#f43f5e', '#3b82f6', '#c98f35', '#f59e0b',
]
