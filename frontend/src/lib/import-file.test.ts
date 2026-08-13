import { describe, expect, it } from 'vitest'
import { validarArquivoPlanilha } from './import-file'

describe('validarArquivoPlanilha', () => {
  it('aceita arquivos xlsx independentemente das letras da extensão', () => {
    expect(validarArquivoPlanilha(new File(['conteúdo'], 'custos.XLSX'))).toBe(true)
  })

  it('rejeita arquivos que não são planilhas xlsx', () => {
    expect(validarArquivoPlanilha(new File(['conteúdo'], 'custos.csv'))).toBe(false)
  })
})
