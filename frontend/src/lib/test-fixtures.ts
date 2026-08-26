import type {
  AnaliseUpload,
  FluxoCaixa,
  Item,
  Local,
  ProjetoResumo,
  ResumoLocal,
} from './types'

/**
 * Stable frontend-only route keys. The backend `projeto_escopo` fixture uses
 * database-generated IDs, so these IDs are intentionally distinct from it;
 * names and source inputs below mirror that fixture for response assertions.
 */
export const PROJETO_FIXTURE_IDS = [101, 202] as const

type ProjetoFixtureId = (typeof PROJETO_FIXTURE_IDS)[number]

const TAXA_IMPOSTOS = 0.15
const MESES_POR_ANO = 12
const HORIZONTES_FLUXO = [6, 12, 24, 36] as const

interface DadosLocalFixture {
  projeto: string
  id: number
  nome: string
  valorMensal: number
  taxaInstalacao: number
  custoManutencao: number
  mensalTerceirizada: number
  chipMensal: number
  custosSoftwares: number
  maoDeObra: number
  item: Item
}

function figura(projeto: string, local: string, tipo: string, valores: number[]): string {
  return JSON.stringify({
    data: [{ name: `${projeto} — ${local}`, x: valores.map((_, i) => i + 1), y: valores }],
    layout: { title: { text: `${projeto} — ${tipo}` } },
  })
}

function calcularResumo(dados: DadosLocalFixture): ResumoLocal {
  const impostos = dados.valorMensal * TAXA_IMPOSTOS
  const saldoAposImpostos = dados.valorMensal - impostos
  const custosFixos =
    dados.custoManutencao
    + dados.mensalTerceirizada
    + dados.chipMensal
    + dados.custosSoftwares
  const saldoMensal = saldoAposImpostos - custosFixos
  const equipamento = dados.item.valor_total
  const investimento = dados.maoDeObra + equipamento
  const tempoRetorno = saldoMensal <= 0
    ? null
    : (investimento - dados.taxaInstalacao) / saldoMensal

  return {
    local: dados.nome,
    valor_mensal: dados.valorMensal,
    taxa_instalacao: dados.taxaInstalacao,
    impostos,
    saldo_apos_impostos: saldoAposImpostos,
    custo_manutencao: dados.custoManutencao,
    mensal_terceirizada: dados.mensalTerceirizada,
    chip_mensal: dados.chipMensal,
    custos_softwares: dados.custosSoftwares,
    saldo_mensal: saldoMensal,
    mao_de_obra: dados.maoDeObra,
    equipamento,
    investimento,
    tempo_retorno: tempoRetorno,
    meses_retorno: saldoMensal <= 0 ? null : Math.ceil((investimento - dados.taxaInstalacao) / saldoMensal),
    margem: dados.valorMensal <= 0 ? null : saldoMensal / dados.valorMensal,
    receita_anual: (dados.valorMensal * MESES_POR_ANO) + dados.taxaInstalacao,
    data_inst: null,
    num_itens: 1,
  }
}

function fluxo(projeto: string, dados: DadosLocalFixture, resumo: ResumoLocal): Record<string, FluxoCaixa> {
  const alvo = resumo.investimento - resumo.taxa_instalacao
  const paybackMes = alvo > 0 && resumo.saldo_mensal > 0
    ? Math.ceil(alvo / resumo.saldo_mensal)
    : null

  return Object.fromEntries(
    HORIZONTES_FLUXO.map((meses) => {
      const pontos = Array.from({ length: meses }, (_, indice) => {
        const mes = indice + 1
        return {
          mes,
          receita: resumo.valor_mensal,
          impostos: resumo.impostos,
          custos_fixos: resumo.custo_manutencao
            + resumo.mensal_terceirizada
            + resumo.chip_mensal
            + resumo.custos_softwares,
          saldo: resumo.saldo_mensal,
          acumulado: resumo.saldo_mensal * mes,
          payback: paybackMes !== null && mes >= paybackMes,
        }
      })

      return [
        String(meses),
        {
          local: dados.nome,
          meses,
          payback_mes: paybackMes,
          pontos,
          grafico: figura(projeto, dados.nome, `Fluxo de caixa (${meses} meses)`, pontos.map((ponto) => ponto.acumulado)),
        },
      ]
    }),
  ) as Record<string, FluxoCaixa>
}

function criarLocal(dados: DadosLocalFixture): Local {
  const resumo = calcularResumo(dados)
  const fluxoLocal = fluxo(dados.projeto, dados, resumo)
  const payback = resumo.tempo_retorno === null ? [] : [0, resumo.saldo_mensal]

  return {
    id: dados.id,
    nome: dados.nome,
    resumo,
    itens: [dados.item],
    insights: [
      { severidade: 'ok', texto: `${dados.nome}: dados de teste isolados do projeto ${dados.projeto}.` },
    ],
    graficos: {
      composicao: figura(dados.projeto, dados.nome, 'Composição', [resumo.mao_de_obra, resumo.equipamento]),
      categorias: figura(dados.projeto, dados.nome, 'Categorias', [resumo.equipamento]),
      pareto: figura(dados.projeto, dados.nome, 'Pareto', [dados.item.valor_total]),
      payback: figura(dados.projeto, dados.nome, 'Payback', payback),
    },
    fluxo: fluxoLocal,
  }
}

function criarResposta(local: Local): AnaliseUpload {
  const { resumo } = local
  return {
    filename: local.nome.replace(/-LOCAL$/, ''),
    avisos: [],
    locais: [local],
    projeto: {
      locais: [resumo],
      totais: {
        receita_mensal: resumo.valor_mensal,
        receita_anual: resumo.receita_anual,
        saldo_mensal: resumo.saldo_mensal,
        investimento: resumo.investimento,
        equipamento: resumo.equipamento,
        mao_de_obra: resumo.mao_de_obra,
        num_locais: 1,
        num_itens: resumo.num_itens,
      },
      graficos: {
        investimento: figura(local.nome.replace(/-LOCAL$/, ''), local.nome, 'Investimento', [resumo.investimento]),
        saldo: figura(local.nome.replace(/-LOCAL$/, ''), local.nome, 'Saldo', [resumo.saldo_mensal]),
        retorno: figura(local.nome.replace(/-LOCAL$/, ''), local.nome, 'Retorno', [resumo.tempo_retorno ?? 0]),
        dispersao: figura(local.nome.replace(/-LOCAL$/, ''), local.nome, 'Dispersão', [resumo.saldo_mensal]),
      },
    },
  }
}

const localProjetoA = criarLocal({
  projeto: 'SC001-P01',
  id: 1101,
  nome: 'SC001-P01-LOCAL',
  valorMensal: 11000,
  taxaInstalacao: 101,
  custoManutencao: 201,
  mensalTerceirizada: 301,
  chipMensal: 41,
  custosSoftwares: 51,
  maoDeObra: 1010,
  item: {
    id: 1201,
    categoria: 'SC001-CATEGORIA-01',
    cod: 'SC001-P01-COD',
    material: 'SC001-P01-ITEM',
    qtd: 1,
    valor_unit: 501,
    valor_total: 501,
  },
})

const localProjetoB = criarLocal({
  projeto: 'SC001-P02',
  id: 2201,
  nome: 'SC001-P02-LOCAL',
  valorMensal: 12000,
  taxaInstalacao: 102,
  custoManutencao: 202,
  mensalTerceirizada: 302,
  chipMensal: 42,
  custosSoftwares: 52,
  maoDeObra: 1020,
  item: {
    id: 2202,
    categoria: 'SC001-CATEGORIA-02',
    cod: 'SC001-P02-COD',
    material: 'SC001-P02-ITEM',
    qtd: 2,
    valor_unit: 502,
    valor_total: 1004,
  },
})

/** Complete GET /api/projetos/{id} responses, keyed by their route ID. */
export const PROJETO_RESPONSES: Record<ProjetoFixtureId, AnaliseUpload> = {
  101: criarResposta(localProjetoA),
  202: criarResposta(localProjetoB),
}

function criarResumoProjeto(
  id: ProjetoFixtureId,
  analise: AnaliseUpload,
  cliente: string,
  criadoEm: string,
): ProjetoResumo {
  const { totais } = analise.projeto
  return {
    id,
    nome: analise.filename ?? `SC001-P${id}`,
    cliente,
    cliente_usuario_id: null,
    criado_em: criadoEm,
    num_locais: totais.num_locais,
    num_itens: totais.num_itens,
    totais: {
      receita_mensal: totais.receita_mensal,
      saldo_mensal: totais.saldo_mensal,
      investimento: totais.investimento,
    },
  }
}

/** Complete GET /api/projetos response matching the two analysis fixtures. */
export const PROJETOS_RESPONSE: ProjetoResumo[] = [
  criarResumoProjeto(101, PROJETO_RESPONSES[101], 'Cliente SC001-P01', '2026-01-01T00:00:00Z'),
  criarResumoProjeto(202, PROJETO_RESPONSES[202], 'Cliente SC001-P02', '2026-02-02T00:00:00Z'),
]
