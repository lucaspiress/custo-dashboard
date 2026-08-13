export function validarArquivoPlanilha(arquivo: File): boolean {
  return arquivo.name.toLowerCase().endsWith('.xlsx')
}
