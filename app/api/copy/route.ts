// app/api/copy/route.ts — caixa "Criativo": recebe { digest, diagnosis },
// gera o CopyPackage via Claude com tool use, valida com zod (com UMA
// retentativa anexando o erro em JSON inválido) e devolve o pacote.
// Erros sempre como { message } em PT-BR.

import { NextResponse } from 'next/server'

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

import {
  COPY_TOOL_NAME,
  buildCopySystemPrompt,
  copyPackageSchema,
  copyTool,
} from '@/lib/boxes/copyPrompt'

export const runtime = 'nodejs'
export const maxDuration = 120

const requestSchema = z.object({
  digest: z.object({
    resumo: z.string().min(1),
    fatos: z.array(z.string()),
    arquivos: z.array(
      z.object({ nome: z.string().min(1), chars: z.number().int().nonnegative() })
    ),
  }),
  diagnosis: z.object({
    prospect: z.string().min(1),
    desejoDominante: z.string().min(1),
    nivelConsciencia: z.enum([
      'unaware',
      'problem_aware',
      'solution_aware',
      'product_aware',
      'most_aware',
    ]),
    sofisticacaoMercado: z.enum(['baixa', 'media', 'alta']),
    crencas: z.array(z.string()),
    objeicoes: z.array(z.string()),
    mecanismo: z.string().min(1),
    prova: z.string().min(1),
  }),
})

/** Erro de geração/validação da copy — permite a retentativa com o detalhe anexado. */
class CopyGenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CopyGenerationError'
  }
}

function modelId(): string {
  return process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'
}

/**
 * Chama o Claude com tool use obrigatório no schema do CopyPackage.
 * Se o tool call vier com JSON inválido, lança CopyGenerationError com o
 * detalhe do validador — quem chama decide se tenta mais uma vez.
 */
async function runCopyAttempt(
  client: Anthropic,
  system: string,
  userContent: string,
  retryHint?: string
): Promise<z.infer<typeof copyPackageSchema>> {
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userContent },
  ]
  if (retryHint) {
    messages.push({
      role: 'user',
      content: [
        'A tentativa anterior não passou na validação do schema de CopyPackage.',
        `Erro do validador: ${retryHint}`,
        `Corrija o JSON e chame a ferramenta ${COPY_TOOL_NAME} novamente, agora com o pacote 100% válido contra o schema.`,
      ].join('\n'),
    })
  }

  const response = await client.messages.create({
    model: modelId(),
    max_tokens: 1600,
    system,
    messages,
    tools: [copyTool],
    tool_choice: { type: 'tool', name: COPY_TOOL_NAME },
  })

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
  )
  if (!toolUse) {
    throw new CopyGenerationError(
      'A IA não chamou a ferramenta de copy. Tente novamente.'
    )
  }

  const parsed = copyPackageSchema.safeParse(toolUse.input)
  if (!parsed.success) {
    const detalhes = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    throw new CopyGenerationError(detalhes)
  }

  return parsed.data
}

export async function POST(request: Request) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          message:
            'Corpo da requisição inválido: envie um JSON com { digest, diagnosis }.',
        },
        { status: 400 }
      )
    }

    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          message:
            'Corpo inválido: { digest } e { diagnosis } devem seguir os contratos do app (lib/contracts.ts).',
        },
        { status: 400 }
      )
    }
    const { digest, diagnosis } = parsed.data

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          message:
            'ANTHROPIC_API_KEY não configurada: defina a chave para gerar a copy.',
        },
        { status: 500 }
      )
    }

    const client = new Anthropic()
    const system = buildCopySystemPrompt(diagnosis)
    const userContent = [
      'Material de entrada da caixa Criativo. Use o digest como fonte dos fatos da marca e o diagnóstico como fonte das regras (consciência, sofisticação, crenças, objeções, mecanismo e prova):',
      JSON.stringify({ digest, diagnosis }, null, 2),
    ].join('\n\n')

    let copy: z.infer<typeof copyPackageSchema>
    try {
      copy = await runCopyAttempt(client, system, userContent)
    } catch (erro) {
      if (!(erro instanceof CopyGenerationError)) throw erro
      // JSON inválido: tenta mais UMA vez com a mensagem de erro anexada.
      try {
        copy = await runCopyAttempt(client, system, userContent, erro.message)
      } catch (segundoErro) {
        const detalhe =
          segundoErro instanceof CopyGenerationError
            ? segundoErro.message
            : 'falha na chamada ao modelo na tentativa de correção'
        return NextResponse.json(
          {
            message: `Não foi possível gerar uma copy válida: ${detalhe}`,
          },
          { status: 502 }
        )
      }
    }

    return NextResponse.json(copy)
  } catch (erro) {
    console.error('POST /api/copy falhou', erro)
    const detalhe = erro instanceof Error ? ` (${erro.message})` : ''
    return NextResponse.json(
      { message: `Erro interno ao gerar a copy.${detalhe}` },
      { status: 500 }
    )
  }
}
