// lib/boxes/interviewPrompt.ts — caixa "Aprender": monta o system prompt do
// entrevistador de diagnóstico, o schema zod do InterviewTurn e a ferramenta
// de tool use para o Claude. A saída é sempre um JSON InterviewTurn
// (contrato em lib/contracts.ts). O campo message é a próxima fala.

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

import type { BrandDigest, ChatMessage, Diagnosis } from '@/lib/contracts'

export const INTERVIEW_TOOL_NAME = 'interview_turn'

/** Teto de perguntas da entrevista (checklist final do plano). */
export const MAX_QUESTIONS = 8

/** Os oito campos do diagnóstico, na ordem da rubrica. */
export const DIAGNOSIS_FIELDS: (keyof Diagnosis)[] = [
  'prospect',
  'desejoDominante',
  'nivelConsciencia',
  'sofisticacaoMercado',
  'crencas',
  'objeicoes',
  'mecanismo',
  'prova',
]

export interface InterviewInput {
  digest: BrandDigest
  history: ChatMessage[]
  partialDiagnosis: Partial<Diagnosis>
  forceComplete: boolean
}

/** Conta campos do diagnóstico com conteúdo real (arrays vazios não contam). */
export function countFilledFields(partial: Partial<Diagnosis>): number {
  return DIAGNOSIS_FIELDS.filter((campo) => {
    const valor = partial[campo]
    if (Array.isArray(valor)) return valor.length > 0
    if (typeof valor === 'string') return valor.trim().length > 0
    return valor !== undefined && valor !== null
  }).length
}

/** Cada turno do assistente no histórico conta como uma pergunta feita. */
export function countQuestionsAsked(history: ChatMessage[]): number {
  return history.filter((message) => message.role === 'assistant').length
}

const NIVEL_CONSCIENCIA_LABEL: Record<Diagnosis['nivelConsciencia'], string> = {
  unaware: 'não sabe que tem o problema',
  problem_aware: 'sabe que tem o problema, mas não conhece solução',
  solution_aware: 'conhece soluções, mas não conhece o produto',
  product_aware: 'conhece o produto, mas não está convencido',
  most_aware: 'conhece o produto e está pronto para comprar',
}

// --- Schema zod do InterviewTurn (mesma forma do contrato) -----------------

export const partialDiagnosisSchema = z.object({
  prospect: z.string().optional(),
  desejoDominante: z.string().optional(),
  nivelConsciencia: z
    .enum(['unaware', 'problem_aware', 'solution_aware', 'product_aware', 'most_aware'])
    .optional(),
  sofisticacaoMercado: z.enum(['baixa', 'media', 'alta']).optional(),
  crencas: z.array(z.string()).optional(),
  objeicoes: z.array(z.string()).optional(),
  mecanismo: z.string().optional(),
  prova: z.string().optional(),
})

export const interviewTurnSchema = z.object({
  message: z.string().min(1),
  diagnosis: partialDiagnosisSchema,
  complete: z.boolean(),
})

export type InterviewTurnOutput = z.infer<typeof interviewTurnSchema>

// --- Ferramenta de tool use -------------------------------------------------

export const interviewTool: Anthropic.Tool = {
  name: INTERVIEW_TOOL_NAME,
  description:
    'Registra o próximo turno da entrevista de diagnóstico: a próxima fala do ' +
    'entrevistador (message), o diagnóstico parcial acumulado (diagnosis) e se a ' +
    'entrevista está completa (complete).',
  input_schema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description:
          'Próxima fala do entrevistador em PT-BR: UMA pergunta direta por vez, ou a mensagem de fechamento quando complete for true. Ancore nas respostas e nos fatos da marca.',
      },
      diagnosis: {
        type: 'object',
        properties: {
          prospect: {
            type: 'string',
            description: 'Quem é o prospect ideal da marca.',
          },
          desejoDominante: {
            type: 'string',
            description: 'O desejo mais forte do prospect que a marca atende.',
          },
          nivelConsciencia: {
            type: 'string',
            enum: ['unaware', 'problem_aware', 'solution_aware', 'product_aware', 'most_aware'],
            description: 'Nível de consciência do prospect (Eugene Schwartz).',
          },
          sofisticacaoMercado: {
            type: 'string',
            enum: ['baixa', 'media', 'alta'],
            description: 'Quão cansado o mercado está das promessas comuns.',
          },
          crencas: {
            type: 'array',
            items: { type: 'string' },
            description: 'Crenças do prospect sobre a categoria.',
          },
          objeicoes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Objeções que o prospect levanta antes de comprar.',
          },
          mecanismo: {
            type: 'string',
            description: 'O mecanismo que torna a promessa da marca crível.',
          },
          prova: {
            type: 'string',
            description: 'Prova real disponível nos fatos da marca. Nunca inventar.',
          },
        },
        description:
          'Diagnóstico parcial ACUMULADO: mantenha os campos já preenchidos e acrescente o que a última resposta revelou.',
      },
      complete: {
        type: 'boolean',
        description:
          'true quando o diagnóstico fecha (oito campos preenchidos, forceComplete ou 8 perguntas feitas).',
      },
    },
    required: ['message', 'diagnosis', 'complete'],
  },
}

// --- System prompt -----------------------------------------------------------

const FIELDS_GUIDE = [
  '## Os oito campos do diagnóstico',
  '- prospect: quem é o prospect ideal da marca.',
  '- desejoDominante: o desejo mais forte do prospect que a marca atende.',
  '- nivelConsciencia: o nível de consciência do prospect. Valores:',
  ...Object.entries(NIVEL_CONSCIENCIA_LABEL).map(
    ([valor, descricao]) => `  - ${valor}: ${descricao}`
  ),
  '- sofisticacaoMercado: quão cansado o mercado está das promessas comuns (baixa | media | alta).',
  '- crencas: o que o prospect acredita sobre a categoria.',
  '- objeicoes: o que impede o prospect de comprar.',
  '- mecanismo: o mecanismo que torna a promessa da marca crível.',
  '- prova: a prova real disponível nos fatos da marca. Nunca inventar.',
].join('\n')

/**
 * Monta o system prompt do entrevistador: fatos do BrandDigest, regras de
 * conduta (PT-BR, uma pergunta por vez, no máximo 8, mirar campos vazios) e o
 * estado atual do diagnóstico parcial. A saída é sempre um InterviewTurn via
 * tool use.
 */
export function buildInterviewSystemPrompt(input: InterviewInput): string {
  const { digest, partialDiagnosis, forceComplete } = input
  const perguntasFeitas = countQuestionsAsked(input.history)
  const camposPreenchidos = countFilledFields(partialDiagnosis)

  const fatos =
    digest.fatos.length > 0 ? digest.fatos.map((fato) => `- ${fato}`).join('\n') : '- (sem fatos listados)'

  return [
    'Você é o entrevistador de diagnóstico do BrandLoop, especialista em publicidade direta no estilo de Breakthrough Advertising. Sua missão é fechar um diagnóstico de oito campos sobre a marca a partir dos fatos coletados e das respostas do usuário.',
    '',
    '## Fatos da marca (BrandDigest)',
    `Resumo: ${digest.resumo}`,
    'Fatos:',
    fatos,
    '',
    '## Regras de conduta',
    '1. Fale SEMPRE em PT-BR, com tom direto, estilo entrevista de diagnóstico: sem rodeios, sem elogios e sem puxar assunto paralelo.',
    '2. Faça UMA pergunta por vez. Perguntas curtas, específicas e ancoradas nos fatos da marca sempre que possível.',
    '3. Use os fatos do BrandDigest para contextualizar as perguntas.',
    '4. Mire nos campos VAZIOS do diagnóstico parcial: nunca pergunte o que já foi respondido.',
    `5. Você faz no máximo ${MAX_QUESTIONS} perguntas no total. Até agora você já fez ${perguntasFeitas} perguntas.`,
    '6. Marque "complete": true SOMENTE em um destes casos:',
    '   a. os oito campos do diagnóstico tiverem conteúdo;',
    '   b. "forceComplete" estiver true;',
    '   c. você já fez 8 perguntas.',
    '   Nos outros casos, "complete": false e a message é a próxima pergunta.',
    '7. Quando completar, a message deve ser um fechamento curto, sem perguntas novas.',
    '',
    FIELDS_GUIDE,
    '',
    '## Estado atual do diagnóstico (Partial<Diagnosis>)',
    JSON.stringify(partialDiagnosis, null, 2),
    `${camposPreenchidos} de 8 campos preenchidos.`,
    forceComplete
      ? 'forceComplete: true — feche o diagnóstico neste turno, preenchendo os campos ainda vazios com a melhor inferência a partir do que já foi dito e dos fatos.'
      : 'forceComplete: false — continue entrevistando até os oito campos terem conteúdo.',
    '',
    '## Regras de saída',
    `Responda SEMPRE chamando a ferramenta ${INTERVIEW_TOOL_NAME} com o JSON completo do InterviewTurn. No campo "diagnosis" devolva o diagnóstico parcial ACUMULADO: mantenha os campos já preenchidos e acrescente as descobertas deste turno. Escreva o campo "message" primeiro no JSON, para que o texto flua em streaming.`,
  ].join('\n')
}
