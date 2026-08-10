export function fmtMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return 'R$ 0,00'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function fmtNumero(valor: number | null | undefined, casas = 1): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—'
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

export function fmtData(valor: string | null | undefined): string {
  if (!valor) return '—'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return valor
  return data.toLocaleDateString('pt-BR')
}

export function fmtPct(valor: number | null | undefined, casas = 1): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—'
  return `${valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`
}

export function baixarBlob(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** Converte texto de número nos formatos BR (1.234,56) e EN (1234.56). */
export function parseNumero(valor: string): number | null {
  const texto = valor.trim().replace(/[R$\s]/g, '')
  if (!texto) return 0
  let normalizado = texto
  if (texto.includes(',') && texto.includes('.')) {
    normalizado = texto.replace(/\./g, '').replace(',', '.')
  } else if (texto.includes(',')) {
    normalizado = texto.replace(',', '.')
  }
  const numero = Number(normalizado)
  return Number.isNaN(numero) ? null : numero
}

/** Data do payload (ISO ou dd/mm/yyyy) para value de input[type=date]. */
export function paraInputDate(valor: string | null | undefined): string {
  if (!valor) return ''
  const iso = valor.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return valor.slice(0, 10)
  const partes = valor.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (partes) return `${partes[3]}-${partes[2].padStart(2, '0')}-${partes[1].padStart(2, '0')}`
  const data = new Date(valor)
  if (!Number.isNaN(data.getTime())) return data.toISOString().slice(0, 10)
  return ''
}
