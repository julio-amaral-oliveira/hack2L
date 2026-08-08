// lib/boxes/researchQuery.ts — caixa "Aprender": transforma { digest, diagnosis }
// em uma query de busca de mercado para a Gorilla via adapter de LLM
// (lib/llm: Claude ou GPT). A saída é um JSON { assunto, queries } com 3 a 5
// frases de busca em PT-BR, na linguagem do prospect.

import { z } from 'zod'

import type { BrandDigest, Diagnosis } from '@/lib/contracts'
import { getLLM } from '@/lib/llm'
import { isMockLLMForced } from '@/lib/mocks/copy'

export const RESEARCH_QUERY_TOOL_NAME = 'research_query'

export const researchQuerySchema = z.object({
  assunto: z.string().min(1),
  queries: z.array(z.string().min(1)).min(3).max(5),
})

export type ResearchQueryOutput = z.infer<typeof researchQuerySchema>

export const researchQueryToolDescription =
  'Transforma o diagnóstico da marca em uma query de busca de mercado: o ' +
  'assunto central e de 3 a 5 frases de busca em PT-BR, na linguagem do ' +
  'prospect (como ele digitaria em fóruns e redes sociais).'

export const researchQueryJsonSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    assunto: {
      type: 'string',
      description:
        'O tema central das buscas, em uma frase curta (ex.: "taxas de delivery comem a margem do restaurante").',
    },
    queries: {
      type: 'array',
      items: { type: 'string' },
      description:
        'De 3 a 5 frases de busca em PT-BR, na linguagem do prospect, como ele digitaria em fóruns, YouTube e redes sociais (ex.: "taxa do iFood come minha margem restaurante"). Cubra a dor, as alternativas, comparações e soluções mencionadas.',
    },
  },
  required: ['assunto', 'queries'],
}

const NIVEL_CONSCIENCIA_LABEL: Record<Diagnosis['nivelConsciencia'], string> = {
  unaware: 'não sabe que tem o problema',
  problem_aware: 'sabe que tem o problema, mas não conhece solução',
  solution_aware: 'conhece soluções, mas não conhece o produto',
  product_aware: 'conhece o produto, mas não está convencido',
  most_aware: 'conhece o produto e está pronto para comprar',
}

/**
 * Monta o system prompt da query de busca: fatos e resumo do BrandDigest mais
 * o diagnóstico (prospect, desejo dominante, nível de consciência e
 * sofisticação) para alinhar as frases à forma como o prospect fala.
 */
export function buildResearchQuerySystemPrompt(
  digest: BrandDigest,
  diagnosis: Diagnosis
): string {
  const fatos =
    digest.fatos.length > 0
      ? digest.fatos.map((fato) => `- ${fato}`).join('\n')
      : '- (sem fatos listados)'

  return [
    'Você é o pesquisador de mercado do BrandLoop. Sua missão é descobrir como o mercado fala sobre o problema do prospect, para alimentar uma busca real na API Gorilla (Reddit, YouTube, fóruns e notícias).',
    '',
    '## Marca (BrandDigest)',
    `Resumo: ${digest.resumo}`,
    'Fatos:',
    fatos,
    '',
    '## Diagnóstico fechado na entrevista',
    `- Prospect: ${diagnosis.prospect}`,
    `- Desejo dominante: ${diagnosis.desejoDominante}`,
    `- Nível de consciência: ${diagnosis.nivelConsciencia} — ${NIVEL_CONSCIENCIA_LABEL[diagnosis.nivelConsciencia]}`,
    `- Sofisticação do mercado: ${diagnosis.sofisticacaoMercado}`,
    diagnosis.crencas.length > 0
      ? `- Crenças do prospect: ${diagnosis.crencas.join('; ')}`
      : '',
    diagnosis.objeicoes.length > 0
      ? `- Objeções: ${diagnosis.objeicoes.join('; ')}`
      : '',
    '',
    '## Regras das frases de busca',
    '1. Escreva as frases em PT-BR, na linguagem do prospect: como ele digitaria em fóruns, YouTube e redes sociais. Nada de jargão de marketing.',
    '2. Cada frase deve focar no prospect e no desejo dominante. Exemplos de formato: "taxa do iFood come minha margem restaurante", "sair do iFood dono de restaurante", "alternativa ao iFood vale a pena restaurante".',
    '3. Cubra: a dor do prospect, as alternativas que ele considera, comparações entre opções e as soluções que ele já testou ou ouviu falar.',
    '4. São exatamente 3 a 5 frases. Separe as frases com ponto e vírgula na resposta ao Gorilla, mas aqui devolva cada uma como item separado do array.',
    '5. Assunto é o tema central de todas as buscas, em uma frase curta.',
    '',
    'Responda chamando a ferramenta research_query com o JSON completo.',
  ]
    .filter((linha) => linha !== '')
    .join('\n')
}

/** Primeira letra minúscula, para encaixar o desejo no meio de uma frase. */
function lowerCaseFirst(texto: string): string {
  if (texto.length === 0) return texto
  return texto.charAt(0).toLowerCase() + texto.slice(1)
}

/**
 * Query de busca determinística, sem LLM: o assunto é o desejo dominante do
 * diagnóstico e as queries são 3 frases de template na linguagem do prospect.
 * Usada sem chave de LLM ou com MOCK_LLM=1 — a busca Gorilla em si continua
 * real.
 */
export function mockResearchQuery(diagnosis: Diagnosis): ResearchQueryOutput {
  const desejo = lowerCaseFirst(diagnosis.desejoDominante)
  const prospect = lowerCaseFirst(diagnosis.prospect)
  return {
    assunto: diagnosis.desejoDominante,
    queries: [
      `${prospect} ${desejo}`,
      `como ${desejo} sendo ${prospect}`,
      `alternativa para ${prospect} ${desejo}`,
    ],
  }
}

/**
 * Gera a query de busca via adapter de LLM. Lança Error com mensagem clara em
 * PT-BR se o modelo devolver JSON inválido. Sem chave — ou com MOCK_LLM=1 —
 * cai no template determinístico de mockResearchQuery.
 */
export async function buildResearchQuery(input: {
  digest: BrandDigest
  diagnosis: Diagnosis
}): Promise<ResearchQueryOutput> {
  const provider = getLLM()
  if (!provider || isMockLLMForced()) {
    return mockResearchQuery(input.diagnosis)
  }

  const result = await provider.generateStructured({
    system: buildResearchQuerySystemPrompt(input.digest, input.diagnosis),
    messages: [
      {
        role: 'user',
        content:
          'Gere a query de busca de mercado para esta marca: { assunto, queries } com 3 a 5 frases em PT-BR.',
      },
    ],
    toolName: RESEARCH_QUERY_TOOL_NAME,
    toolDescription: researchQueryToolDescription,
    jsonSchema: researchQueryJsonSchema,
    maxTokens: 800,
  })

  const parsed = researchQuerySchema.safeParse(result)
  if (!parsed.success) {
    throw new Error(
      'A IA devolveu uma query de busca inválida. Tente novamente.'
    )
  }
  return parsed.data
}
