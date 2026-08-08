// lib/boxes/copyPrompt.ts — caixa "Criativo": monta o system prompt da copy
// (rubrica de Schwartz + regras de saída), o schema zod do CopyPackage e a
// definição da ferramenta de tool use para o Claude.
// O contrato CopyPackage vive em lib/contracts.ts (imutável).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

import type { Diagnosis } from '@/lib/contracts'

/** Destino do CTA da copy. Default da landing page da demo. */
export const LANDING_PAGE_URL =
  process.env.LANDING_PAGE_URL ?? 'https://brandloop-lp.vercel.app'

/** Lê a rubrica de lib/copy-rubric.md (cópia exata do arquivo da raiz). */
export function readCopyRubric(): string {
  return readFileSync(join(process.cwd(), 'lib', 'copy-rubric.md'), 'utf-8')
}

// --- Schema zod do CopyPackage (mesma forma do contrato) -----------------

export const sceneSchema = z.object({
  ordem: z.number().int().positive(),
  fala: z.string().min(1),
  textoNaTela: z.string().min(1),
  duracaoSeg: z.number().int().positive(),
})

export const copyPackageSchema = z.object({
  headline: z.string().min(1),
  roteiro: z.array(sceneSchema).min(3).max(5),
  titulo: z.string().min(1).max(100),
  descricao: z.string().min(1),
  hashtags: z.array(z.string().min(1)).min(3).max(5),
  cta: z.string().min(1),
  videoPrompt: z.string().min(1),
})

export type CopyPackageOutput = z.infer<typeof copyPackageSchema>

// --- Ferramenta de tool use -------------------------------------------------

export const COPY_TOOL_NAME = 'copy_package'

export const copyTool: Anthropic.Tool = {
  name: COPY_TOOL_NAME,
  description:
    'Gera o CopyPackage completo: headline, roteiro do vídeo em cenas, título, ' +
    'descrição, hashtags, CTA e o prompt do vídeo vertical. Tudo em PT-BR, ' +
    'exceto o videoPrompt, que é em inglês. Nunca invente provas: use apenas ' +
    'os fatos e a prova do diagnóstico.',
  input_schema: {
    type: 'object',
    properties: {
      headline: {
        type: 'string',
        description:
          'Headline em PT-BR que abre um loop mental no prospect, alinhada ao desejo dominante e ao nível de consciência.',
      },
      roteiro: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ordem: { type: 'integer', description: 'Número da cena, começando em 1.' },
            fala: {
              type: 'string',
              description: 'Fala narrada da cena, em PT-BR, em linguagem do prospect.',
            },
            textoNaTela: {
              type: 'string',
              description: 'Texto exibido na tela na cena, em PT-BR, com no máximo 3 palavras.',
            },
            duracaoSeg: { type: 'integer', description: 'Duração da cena em segundos.' },
          },
          required: ['ordem', 'fala', 'textoNaTela', 'duracaoSeg'],
        },
        description: 'De 3 a 5 cenas, com duração total entre 15 e 30 segundos.',
      },
      titulo: {
        type: 'string',
        description: 'Título do vídeo para o Shorts, em PT-BR, com no máximo 100 caracteres.',
      },
      descricao: {
        type: 'string',
        description: 'Descrição do vídeo em PT-BR: promessa, mecanismo e chamada para o CTA.',
      },
      hashtags: {
        type: 'array',
        items: { type: 'string' },
        description: 'De 3 a 5 hashtags em PT-BR, com o caractere # no início.',
      },
      cta: {
        type: 'string',
        description: 'URL do CTA — sempre a landing page oficial.',
      },
      videoPrompt: {
        type: 'string',
        description:
          'Prompt do vídeo em INGLÊS: descreve a CENA 1 do roteiro (ambiente, ação e enquadramento), formato vertical 9:16, e diz que o texto na tela é em PT-BR com no máximo 3 palavras por tela.',
      },
    },
    required: ['headline', 'roteiro', 'titulo', 'descricao', 'hashtags', 'cta', 'videoPrompt'],
  },
}

// --- System prompt -----------------------------------------------------------

const NIVEL_CONSCIENCIA_LABEL: Record<Diagnosis['nivelConsciencia'], string> = {
  unaware: 'Unaware — não sabe que tem o problema: desperte atenção com situação, desejo ou emoção.',
  problem_aware:
    'Problem aware — sabe que tem o problema, mas não conhece solução: aprofunde o problema e apresente a possibilidade de resolvê-lo.',
  solution_aware:
    'Solution aware — conhece soluções, mas não conhece o produto: apresente a solução e explique por que ela é diferente.',
  product_aware:
    'Product aware — conhece o produto, mas não está convencido: trabalhe mecanismo, diferenciação, prova, objeções e oferta.',
  most_aware:
    'Most aware — conhece o produto e quer comprar: foco em oferta, condições, prova, incentivo e ação, sem explicar o óbvio.',
}

const SOFISTICACAO_LABEL: Record<Diagnosis['sofisticacaoMercado'], string> = {
  baixa: 'baixa — o público ainda não se cansou das promessas comuns; a promessa direta ainda funciona.',
  media: 'média — o público já viu promessas parecidas; exija diferenciação no mecanismo e no ângulo.',
  alta: 'alta — o público já ouviu a mesma promessa centenas de vezes; exija mecanismo novo, prova nova e ângulo novo.',
}

/**
 * Monta o system prompt da copy: o texto integral da rubrica de
 * Breakthrough Advertising (lido de lib/copy-rubric.md) mais as regras de
 * saída obrigatórias. O diagnóstico entra aqui para fixar o nível de
 * consciência e a sofisticação de mercado.
 */
export function buildCopySystemPrompt(diagnosis: Diagnosis): string {
  const rubric = readCopyRubric()
  return [
    'Você é o copywriter do BrandLoop. A rubrica abaixo é a sua metodologia obrigatória:',
    '',
    '===== RUBRICA =====',
    rubric,
    '===== FIM DA RUBRICA =====',
    '',
    '## REGRAS DE SAÍDA OBRIGATÓRIAS',
    '1. Todo o texto deve ser escrito em PT-BR, na linguagem do prospect. A única exceção é o campo videoPrompt, que deve ser escrito em INGLÊS.',
    `2. Respeite o nível de consciência do prospect: ${diagnosis.nivelConsciencia} — ${NIVEL_CONSCIENCIA_LABEL[diagnosis.nivelConsciencia]}`,
    `3. Respeite a sofisticação do mercado: ${diagnosis.sofisticacaoMercado} — ${SOFISTICACAO_LABEL[diagnosis.sofisticacaoMercado]}`,
    '4. Nunca invente provas: não crie números, estatísticas, depoimentos, estudos, resultados, escassez ou urgência. Use apenas o campo prova do diagnóstico, se existir. Se não houver prova, reformule a afirmação.',
    '5. O campo roteiro deve ter de 3 a 5 cenas, com duração total entre 15 e 30 segundos.',
    '6. O campo titulo deve ter no máximo 100 caracteres.',
    '7. O campo hashtags deve ter de 3 a 5 hashtags.',
    `8. O campo cta deve apontar para a landing page oficial: ${LANDING_PAGE_URL}`,
    '9. O campo videoPrompt deve estar em INGLÊS, descrever apenas a CENA 1 do roteiro (o ambiente, a ação e o enquadramento), ser para formato vertical 9:16 e indicar que o texto na tela é em PT-BR com no máximo 3 palavras por tela.',
    '',
    'Responda chamando a ferramenta copy_package com o JSON completo do CopyPackage.',
  ].join('\n')
}
