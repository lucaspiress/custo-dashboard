export const COR = {
  primaria: '#1E40AF',
  secundaria: '#3B82F6',
  destaque: '#D97706',
  fundo: '#F8FAFC',
  superficie: '#FFFFFF',
  sidebar: '#F1F5F9',
  borda: '#DBEAFE',
  mutado: '#64748B',
  tinta: '#0F172A',
  sucesso: '#16A34A',
  alerta: '#DC2626',
  dica: '#1E40AF',
  grid: '#E9EEF6',
  ciano: '#0EA5E9',
  violeta: '#8B5CF6',
  cinza: '#94A3B8',
  rosa: '#EC4899',
} as const

export const KPI_CORES: Record<string, string> = {
  'Receita mensal': COR.primaria,
  'Receita anual': COR.secundaria,
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
  ok: { cor: COR.sucesso, fundo: '#F0FDF4', borda: '#BBF7D0', rotulo: 'OK' },
  atencao: { cor: COR.destaque, fundo: '#FFF7ED', borda: '#FED7AA', rotulo: 'Atenção' },
  alerta: { cor: COR.alerta, fundo: '#FEF2F2', borda: '#FECACA', rotulo: 'Alerta' },
  dica: { cor: COR.dica, fundo: '#EFF6FF', borda: '#BFDBFE', rotulo: 'Dica' },
}

export const PALETA_GRAFICOS = [
  '#1E40AF', '#3B82F6', '#D97706', '#16A34A', '#DC2626',
  '#8B5CF6', '#0EA5E9', '#F59E0B', '#EC4899', '#14B8A6',
]
