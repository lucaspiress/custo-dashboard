export const COR = {
  primaria: '#2e59f6',
  primariaHover: '#4669f7',
  secundaria: '#3061d9',
  destaque: '#e07b1a',
  fundo: '#121622',
  superficie: '#181f32',
  elevado: '#222b45',
  sidebar: '#0c111c',
  borda: '#1f2740',
  mutado: '#8fa3c7',
  tinta: '#f5f7fc',
  sucesso: '#10b981',
  alerta: '#ef4444',
  dica: '#3b82f6',
  grid: '#1f2740',
  ciano: '#18d6ec',
  violeta: '#6649df',
  cinza: '#94a3b8',
  rosa: '#f43f5e',
  azulCla: '#5b8cff',
  dourado: '#c98f35',
  laranja: '#bc512c',
} as const

export const KPI_CORES: Record<string, string> = {
  'Receita mensal': '#5b8cff',
  'Receita anual': '#18d6ec',
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
  ok: { cor: '#10b981', fundo: 'rgba(16, 185, 129, 0.10)', borda: 'rgba(16, 185, 129, 0.30)', rotulo: 'OK' },
  atencao: { cor: '#e07b1a', fundo: 'rgba(224, 123, 26, 0.10)', borda: 'rgba(224, 123, 26, 0.30)', rotulo: 'Atenção' },
  alerta: { cor: '#ef4444', fundo: 'rgba(239, 68, 68, 0.10)', borda: 'rgba(239, 68, 68, 0.30)', rotulo: 'Alerta' },
  dica: { cor: '#5b8cff', fundo: 'rgba(91, 140, 255, 0.10)', borda: 'rgba(91, 140, 255, 0.30)', rotulo: 'Dica' },
}

export const PALETA_GRAFICOS = [
  '#2e59f6', '#18d6ec', '#5b8cff', '#e07b1a', '#10b981',
  '#6649df', '#f43f5e', '#3b82f6', '#c98f35', '#f59e0b',
]
