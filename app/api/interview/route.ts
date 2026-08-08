// app/api/interview/route.ts — caixa "Aprender": entrevista adaptativa em SSE.
// Recebe { digest, history, partialDiagnosis, forceComplete }, chama o Claude
// com streaming (tool use no schema do InterviewTurn) e emite um evento SSE
// por linha no formato `data: {...}\n\n`:
//   1. eventos `token` com o texto da message (extraídos do JSON da tool use);
//   2. um evento `turn` com o InterviewTurn completo;
//   3. evento `error` em qualquer falha.
// Contratos dos eventos em lib/contracts.ts (imutável).

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

import type {
  BrandDigest,
  ChatMessage,
  Diagnosis,
  InterviewEvent,
  InterviewTurn,
} from '@/lib/contracts'
import {
  INTERVIEW_TOOL_NAME,
  buildInterviewSystemPrompt,
  interviewTool,
  interviewTurnSchema,
  partialDiagnosisSchema,
} from '@/lib/boxes/interviewPrompt'

export const runtime = 'nodejs'
export const maxDuration = 120

interface InterviewRequestBody {
  digest: BrandDigest
  history: ChatMessage[]
  partialDiagnosis: Partial<Diagnosis>
  forceComplete: boolean
}

const interviewRequestSchema = z.object({
  digest: z.object({
    resumo: z.string().min(1),
    fatos: z.array(z.string()),
    arquivos: z
      .array(z.object({ nome: z.string(), chars: z.number().nonnegative() }))
      .optional()
      .default([]),
  }),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
  partialDiagnosis: partialDiagnosisSchema.optional().default({}),
  forceComplete: z.boolean().optional().default(false),
})

function modelId(): string {
  return process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5'
}

/**
 * Lê o valor do campo "message" de um JSON parcial (tolerante a JSON
 * incompleto). Usado para transmitir os tokens da fala do entrevistador
 * ao vivo, enquanto a tool use ainda está sendo gerada.
 */
function extractMessageFromPartialJson(partialJson: string): string {
  const keyMatch = /"message"\s*:/.exec(partialJson)
  if (!keyMatch) return ''
  let i = keyMatch.index + keyMatch[0].length
  while (i < partialJson.length && /\s/.test(partialJson[i]!)) i++
  if (partialJson[i] !== '"') return ''
  i++
  let out = ''
  while (i < partialJson.length) {
    const ch = partialJson[i]!
    if (ch === '\\') {
      if (i + 1 >= partialJson.length) break
      const next = partialJson[i + 1]!
      if (next === 'n') out += '\n'
      else if (next === 't') out += '\t'
      else if (next === 'r') out += '\r'
      else if (next === 'b') out += '\b'
      else if (next === 'f') out += '\f'
      else if (next === 'u' && i + 5 < partialJson.length) {
        const hex = partialJson.slice(i + 2, i + 6)
        if (/^[0-9a-fA-F]{4}$/.test(hex)) out += String.fromCharCode(parseInt(hex, 16))
        i += 6
        continue
      } else out += next
      i += 2
      continue
    }
    if (ch === '"') break
    out += ch
    i++
  }
  return out
}

/** Converte o histórico em mensagens da API, garantindo fim em role user. */
function buildApiMessages(history: ChatMessage[]): Anthropic.MessageParam[] {
  const mapped = history.map(
    (message): Anthropic.MessageParam => ({
      role: message.role === 'user' ? 'user' : 'assistant',
      content: message.content,
    })
  )
  if (mapped.length === 0) {
    return [
      {
        role: 'user',
        content:
          'Inicie a entrevista de diagnóstico da marca. Faça a primeira pergunta.',
      },
    ]
  }
  if (mapped[mapped.length - 1].role === 'assistant') {
    // Sem resposta nova do usuário (ex.: "Fechar diagnóstico agora"):
    // o modelo fecha o turno com o que já foi coletado.
    mapped.push({
      role: 'user',
      content:
        '[Nenhuma resposta nova do usuário. Feche o turno com o que já foi coletado.]',
    })
  }
  return mapped
}

function errorMessage(erro: unknown): string {
  if (erro instanceof Anthropic.APIError) {
    const status = erro.status ? ` (HTTP ${erro.status})` : ''
    return `Falha na chamada ao modelo.${status} ${erro.message}`
  }
  return erro instanceof Error ? erro.message : 'Erro interno na entrevista.'
}

export async function POST(request: Request): Promise<Response> {
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: InterviewEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          )
        } catch {
          // Cliente desconectou; encerra a escrita.
          controller.close()
        }
      }

      try {
        // 1. Corpo da requisição.
        let body: unknown
        try {
          body = await request.json()
        } catch {
          body = null
        }
        const parsed = interviewRequestSchema.safeParse(body)
        if (!parsed.success) {
          send({
            type: 'error',
            message:
              'Corpo inválido: envie um JSON com { digest, history, partialDiagnosis, forceComplete } conforme os contratos do app.',
          })
          controller.close()
          return
        }
        const input = parsed.data as InterviewRequestBody

        // 2. Chave obrigatória.
        if (!process.env.ANTHROPIC_API_KEY) {
          send({
            type: 'error',
            message:
              'ANTHROPIC_API_KEY não configurada: defina a chave para rodar a entrevista.',
          })
          controller.close()
          return
        }

        // 3. Claude com streaming e tool use no schema do InterviewTurn.
        const client = new Anthropic()
        const streamMessage = client.messages.stream({
          model: modelId(),
          max_tokens: 2048,
          system: buildInterviewSystemPrompt(input),
          messages: buildApiMessages(input.history),
          tools: [interviewTool],
          tool_choice: { type: 'tool', name: INTERVIEW_TOOL_NAME },
        })

        let jsonBuf = ''
        let lastMessageLength = 0

        for await (const event of streamMessage) {
          if (event.type !== 'content_block_delta') continue
          if (event.delta.type !== 'input_json_delta') continue
          jsonBuf += event.delta.partial_json
          const messageSoFar = extractMessageFromPartialJson(jsonBuf)
          if (messageSoFar.length > lastMessageLength) {
            send({ type: 'token', value: messageSoFar.slice(lastMessageLength) })
            lastMessageLength = messageSoFar.length
          }
        }

        // 4. Turno final com o JSON completo da tool use.
        const finalMessage = await streamMessage.finalMessage()
        const toolUse = finalMessage.content.find(
          (block): block is Anthropic.ToolUseBlock =>
            block.type === 'tool_use' && block.name === INTERVIEW_TOOL_NAME
        )
        if (!toolUse) {
          send({
            type: 'error',
            message: 'O entrevistador não devolveu um turno válido. Tente novamente.',
          })
          controller.close()
          return
        }

        const turnResult = interviewTurnSchema.safeParse(toolUse.input)
        if (!turnResult.success) {
          send({
            type: 'error',
            message: 'O entrevistador devolveu um JSON inválido. Tente novamente.',
          })
          controller.close()
          return
        }

        send({ type: 'turn', value: turnResult.data as InterviewTurn })
        controller.close()
      } catch (erro) {
        console.error('POST /api/interview falhou:', erro)
        send({ type: 'error', message: errorMessage(erro) })
        controller.close()
      }
    },
    cancel() {
      // Cliente desistiu da leitura; nada a limpar (servidor stateless).
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
