// lib/boxes/ingest.ts — caixa "Aprender": condensa arquivos da marca em um
// BrandDigest (contrato em lib/contracts.ts). Sem ANTHROPIC_API_KEY, cai no
// fallback local (resumo + headings). Nunca inventa fatos.

import Anthropic from '@anthropic-ai/sdk'

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

const DIGEST_TOOL: Anthropic.Tool = {
  name: 'criar_brand_digest',
  description:
    'Condensa o material bruto da marca em um BrandDigest: resumo curto e fatos objetivos, sempre fiéis ao texto enviado. Nunca invente informações que não estejam no texto.',
  input_schema: {
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
  },
}

function llmModel(): string {
  return process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'
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

  if (!process.env.ANTHROPIC_API_KEY) {
    const { resumo, fatos } = localFallback(textoCompleto)
    return { resumo, fatos, arquivos }
  }

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: llmModel(),
      max_tokens: 1024,
      system:
        'Você condensa material bruto de uma marca em um resumo objetivo e em fatos curtos, em PT-BR. ' +
        'Seja fiel ao texto: nunca invente produtos, números ou afirmações que não estejam no material.',
      messages: [{ role: 'user', content: textoCompleto }],
      tools: [DIGEST_TOOL],
      tool_choice: { type: 'tool', name: DIGEST_TOOL.name },
    })

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock =>
        block.type === 'tool_use' && block.name === DIGEST_TOOL.name
    )
    if (!toolUse) {
      throw new IngestError(
        'A IA não devolveu um resumo válido. Tente novamente.',
        500
      )
    }

    const { resumo, fatos } = parseDigestInput(toolUse.input)
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
      'Falha ao condensar o material com a IA. Verifique a chave ANTHROPIC_API_KEY e tente novamente.',
      500
    )
  }
}
