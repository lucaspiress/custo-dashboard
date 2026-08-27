import { describe, expect, it } from 'vitest'
import { validarArquivoPlanilha } from './import-file'

describe('validarArquivoPlanilha', () => {
  it.each(['custos.xlsx', 'custos.XLSX', 'Custos finais.xLsX'])(
    'aceita arquivos .xlsx no fluxo suportado: %s',
    (nome) => {
      expect(validarArquivoPlanilha(new File(['conteúdo'], nome))).toBe(true)
    },
  )

  it('valida o arquivo pela extensão no nível da operação', () => {
    expect(
      validarArquivoPlanilha(
        new File([], 'custos.xlsx', {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      ),
    ).toBe(true)
  })

  it.each(['custos.csv', 'custos.xls', 'custos.xlsx.csv', 'custos'])
    ('rejeita extensões não suportadas: %s', (nome) => {
      expect(validarArquivoPlanilha(new File(['conteúdo'], nome))).toBe(false)
    })
})
