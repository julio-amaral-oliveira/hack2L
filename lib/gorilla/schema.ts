// lib/gorilla/schema.ts — o JSON Schema que a Gorilla preenche a partir dos
// posts reais. Este é o pulo do gato da integração: em vez de receber uma
// lista de links e pedir para um LLM resumir, mandamos o formato do
// diagnóstico junto da busca e recebemos ele preenchido, ancorado nos posts,
// com URL de evidência em cada campo — e sem custo extra de créditos.
//
// Restrição da API: modo strict exige `required` com TODAS as chaves e
// `additionalProperties: false` em todo objeto. Os helpers abaixo garantem isso.

/** Objeto strict: todas as chaves obrigatórias, nada extra. */
function strict(properties: Record<string, unknown>) {
  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  }
}

/** Array de objetos strict. */
function arrayOf(description: string, properties: Record<string, unknown>) {
  return { type: 'array', description, items: strict(properties) }
}

const TEXTO_COM_FONTE = {
  texto: { type: 'string' },
  evidenciaUrl: { type: 'string', description: 'URL do post que sustenta a afirmação.' },
}

/**
 * Diagnóstico nos termos da rubrica de Breakthrough Advertising.
 * Espelha os oito campos de `Diagnosis` (lib/contracts.ts), com duas
 * diferenças propositais — ver lib/gorilla/README.md:
 *   1. cada crença/objeção carrega `evidenciaUrl`;
 *   2. sofisticação é 1..5 (escala real de Schwartz), não baixa|media|alta.
 */
export const DIAGNOSTICO_SCHEMA = strict({
  prospect: { type: 'string', description: 'Quem é o prospect, em uma frase.' },
  desejoDominante: { type: 'string' },
  nivelConsciencia: {
    type: 'string',
    enum: [
      'unaware',
      'problem_aware',
      'solution_aware',
      'product_aware',
      'most_aware',
    ],
  },
  nivelConscienciaJustificativa: { type: 'string' },
  sofisticacaoMercado: {
    type: 'integer',
    description: 'Estágio 1 a 5 da escala de Eugene Schwartz.',
  },
  sofisticacaoJustificativa: { type: 'string' },
  crencas: arrayOf('O que o prospect já acredita sobre a categoria.', TEXTO_COM_FONTE),
  objecoes: arrayOf('O que impede o prospect de agir.', TEXTO_COM_FONTE),
  mencoesConcorrente: arrayOf('Concorrentes citados e o motivo.', {
    concorrente: { type: 'string' },
    motivo: { type: 'string' },
    evidenciaUrl: { type: 'string' },
  }),
  linguagemDoProspect: {
    type: 'array',
    description: 'Frases literais que o prospect usa. Verbatim, sem reescrever.',
    items: { type: 'string' },
  },
  mecanismo: {
    type: 'string',
    description:
      'Mecanismo que responde ao estágio de sofisticação. Em estágio 4 ou 5, ' +
      'não repita claim já feito pelo mercado.',
  },
  prova: arrayOf('Provas disponíveis para sustentar o mecanismo.', TEXTO_COM_FONTE),
})

/**
 * Leitura de concorrência: o que os entrantes prometeram, o que já quebrou,
 * e onde a marca está exposta.
 */
export const CONCORRENCIA_SCHEMA = strict({
  resumoDaReacao: { type: 'string', description: 'Como o mercado reagiu, em 3 frases.' },
  promessasDosEntrantes: arrayOf('Claims que os concorrentes fizeram.', {
    player: { type: 'string' },
    promessa: { type: 'string' },
    evidenciaUrl: { type: 'string' },
  }),
  promessasQueQuebraram: arrayOf('Promessas que mudaram ou não se sustentaram.', {
    player: { type: 'string' },
    oQueMudou: { type: 'string' },
    evidenciaUrl: { type: 'string' },
  }),
  ceticismoDoMercado: arrayOf('Sinais de desconfiança com os entrantes.', TEXTO_COM_FONTE),
  vulnerabilidades: arrayOf('Onde a marca contratante está exposta.', TEXTO_COM_FONTE),
  anguloDefensivo: { type: 'string' },
  frasesLiterais: { type: 'array', items: { type: 'string' } },
})

/**
 * Monta a query multi-termo. A Gorilla roda cada termo como sub-query
 * paralela e devolve uma lista deduplicada.
 *
 * Regra que veio da execução real: busque a DOR em primeira pessoa, não o
 * nome da marca. "taxa come minha margem" traz gente; "iFood" traz notícia.
 */
export function montarQuery(termos: string[]): string {
  const query = termos
    .map((t) => t.trim())
    .filter(Boolean)
    .join('; ')
  return query.length > 500 ? query.slice(0, 500) : query
}
