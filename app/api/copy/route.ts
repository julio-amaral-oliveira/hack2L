// app/api/copy/route.ts — caixa "Criativo": recebe { digest, diagnosis },
// gera o CopyPackage via LLM do adapter (lib/llm: Claude ou GPT) com tool
// use, valida com zod (com UMA retentativa anexando o erro em JSON inválido)
// e devolve o pacote. Erros sempre como { message } em PT-BR.

import { NextResponse } from 'next/server'

import { z } from 'zod'

import {
  COPY_TOOL_NAME,
  buildCopySystemPrompt,
  copyJsonSchema,
  copyPackageSchema,
  copyToolDescription,
} from '@/lib/boxes/copyPrompt'
import { getLLM } from '@/lib/llm'
import type { LLMProvider } from '@/lib/llm'

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

/**
 * Chama o LLM com tool use obrigatório no schema do CopyPackage.
 * Se o tool call vier com JSON inválido, lança CopyGenerationError com o
 * detalhe do validador — quem chama decide se tenta mais uma vez.
 */
async function runCopyAttempt(
  provider: LLMProvider,
  system: string,
  userContent: string,
  retryHint?: string
): Promise<z.infer<typeof copyPackageSchema>> {
  const messages = [{ role: 'user' as const, content: userContent }]
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

  const output = await provider.generateStructured({
    system,
    messages,
    toolName: COPY_TOOL_NAME,
    toolDescription: copyToolDescription,
    jsonSchema: copyJsonSchema,
    maxTokens: 1600,
  })

  const parsed = copyPackageSchema.safeParse(output)
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

    const provider = getLLM()
    if (!provider) {
      return NextResponse.json(
        {
          message:
            'Nenhuma chave de LLM configurada: defina ANTHROPIC_API_KEY ou OPENAI_API_KEY.',
        },
        { status: 500 }
      )
    }

    const system = buildCopySystemPrompt(diagnosis)
    const userContent = [
      'Material de entrada da caixa Criativo. Use o digest como fonte dos fatos da marca e o diagnóstico como fonte das regras (consciência, sofisticação, crenças, objeções, mecanismo e prova):',
      JSON.stringify({ digest, diagnosis }, null, 2),
    ].join('\n\n')

    let copy: z.infer<typeof copyPackageSchema>
    try {
      copy = await runCopyAttempt(provider, system, userContent)
    } catch (erro) {
      if (!(erro instanceof CopyGenerationError)) throw erro
      // JSON inválido: tenta mais UMA vez com a mensagem de erro anexada.
      try {
        copy = await runCopyAttempt(provider, system, userContent, erro.message)
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
