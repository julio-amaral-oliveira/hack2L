// lib/boxes/ingest.ts — caixa "Aprender": condensa arquivos da marca em um
// BrandDigest (contrato em lib/contracts.ts). Com LLM disponível (Claude ou
// GPT via lib/llm), condensa com tool use; sem chave nenhuma, cai no fallback
// local (resumo + headings). Nunca inventa fatos.

import { getLLM } from '@/lib/llm'

import type { BrandDigest } from '@/lib/contracts'

export interface IngestFile {
  nome: string
  texto: string
}

export const MAX_TOTAL_CHARS = 200 * 1024 // 200 KB de texto no total

export const RESUME_MAX_CHARS = 400 // teto do resumo gerado pela IA

const ALLOWED_EXTENSION = /\.(txt|md|markdown)$/i

const HEADING_LINE = /^#{1,6}\s+.+$/

export class IngestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'IngestError'
    this.status = status
  }
}

export function hasAllowedExtension(nome: string): boolean {
  return ALLOWED_EXTENSION.test(nome)
}

const DIGEST_TOOL_NAME = 'criar_brand_digest'

const DIGEST_TOOL_DESCRIPTION =
  'Condensa o material bruto da marca em um BrandDigest: resumo curto e fatos objetivos, sempre fiéis ao texto enviado. Nunca invente informações que não estejam no texto.'

const DIGEST_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    resumo: {
      type: 'string',
      description:
        'Resumo da marca em PT-BR, com no máximo 400 caracteres. Sintetiza o que a marca vende, para quem e o tom.',
    },
    fatos: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Fatos curtos e fiéis ao texto: produtos, público, dores, tom de voz, campanhas. Bullets de poucas palavras. Nunca inventar.',
    },
  },
  required: ['resumo', 'fatos'],
}

function joinTexts(files: IngestFile[]): string {
  return files.map((f) => `--- ${f.nome} ---\n${f.texto}`).join('\n\n')
}

/** Fallback local sem chave: resumo = primeiros 1500 caracteres, fatos = headings. */
function localFallback(textoCompleto: string): Pick<BrandDigest, 'resumo' | 'fatos'> {
  const resumo = textoCompleto.slice(0, 1500)
  const fatos = textoCompleto
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => HEADING_LINE.test(linha))
    .map((linha) => linha.replace(/^#{1,6}\s+/, '').trim())
    .filter(Boolean)
  return { resumo, fatos }
}

function parseDigestInput(input: unknown): { resumo: string; fatos: string[] } {
  const raw = (input ?? {}) as { resumo?: unknown; fatos?: unknown }
  const resumo = typeof raw.resumo === 'string' ? raw.resumo : ''
  const fatos = Array.isArray(raw.fatos)
    ? raw.fatos.filter((fato): fato is string => typeof fato === 'string')
    : []
  return { resumo, fatos }
}

/** Condensa os arquivos em um BrandDigest. Lança IngestError em falhas. */
export async function ingestFiles(files: IngestFile[]): Promise<BrandDigest> {
  for (const arquivo of files) {
    if (!hasAllowedExtension(arquivo.nome)) {
      throw new IngestError(
        `Formato não suportado: ${arquivo.nome}. Envie apenas arquivos .txt, .md ou .markdown.`,
        400
      )
    }
  }

  const total = files.reduce((acc, arquivo) => acc + arquivo.texto.length, 0)
  if (total > MAX_TOTAL_CHARS) {
    throw new IngestError(
      `O material excede o limite de 200 KB (${total} caracteres). Envie menos conteúdo.`,
      400
    )
  }

  const arquivos = files.map((arquivo) => ({
    nome: arquivo.nome,
    chars: arquivo.texto.length,
  }))

  const textoCompleto = joinTexts(files)

  const provider = getLLM()
  if (!provider) {
    const { resumo, fatos } = localFallback(textoCompleto)
    return { resumo, fatos, arquivos }
  }

  try {
    const output = await provider.generateStructured({
      system:
        'Você condensa material bruto de uma marca em um resumo objetivo e em fatos curtos, em PT-BR. ' +
        'Seja fiel ao texto: nunca invente produtos, números ou afirmações que não estejam no material.',
      messages: [{ role: 'user', content: textoCompleto }],
      toolName: DIGEST_TOOL_NAME,
      toolDescription: DIGEST_TOOL_DESCRIPTION,
      jsonSchema: DIGEST_JSON_SCHEMA,
      maxTokens: 1024,
    })

    const { resumo, fatos } = parseDigestInput(output)
    if (!resumo.trim()) {
      throw new IngestError(
        'A IA não devolveu um resumo válido. Tente novamente.',
        500
      )
    }

    return {
      resumo: resumo.slice(0, RESUME_MAX_CHARS),
      fatos,
      arquivos,
    }
  } catch (error) {
    if (error instanceof IngestError) throw error
    throw new IngestError(
      'Falha ao condensar o material com a IA. Verifique a chave de LLM configurada e tente novamente.',
      500
    )
  }
}
