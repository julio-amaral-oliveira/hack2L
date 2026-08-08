// app/api/interview/route.ts — caixa "Aprender": entrevista adaptativa em SSE.
// Recebe { digest, history, partialDiagnosis, forceComplete }, chama o LLM do
// adapter (lib/llm: Claude ou GPT) com streaming de tool use no schema do
// InterviewTurn e emite um evento SSE por linha no formato `data: {...}\n\n`:
//   1. eventos `token` com o texto da message (extraídos do JSON da tool use);
//   2. um evento `turn` com o InterviewTurn completo;
//   3. evento `error` em qualquer falha.
// Contratos dos eventos em lib/contracts.ts (imutável).

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
  interviewJsonSchema,
  interviewToolDescription,
  interviewTurnSchema,
  partialDiagnosisSchema,
} from '@/lib/boxes/interviewPrompt'
import { getLLM } from '@/lib/llm'
import type { StructuredRequest } from '@/lib/llm'
import {
  isInterviewMockForced,
  mockInterviewTokens,
  mockInterviewTurn,
} from '@/lib/mocks/interview'

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

/** Converte o histórico em mensagens da API, garantindo fim em role user. */
function buildApiMessages(
  history: ChatMessage[]
): StructuredRequest['messages'] {
  const mapped = history.map((message) => ({
    role: message.role,
    content: message.content,
  }))
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

        // 2. LLM (Claude ou GPT via adapter). Sem chave — ou com
        // INTERVIEW_MOCK=1 — a entrevista cai no roteiro determinístico de
        // lib/mocks/interview.ts, em vez de morrer com erro. O diagnóstico do
        // mock vem da busca real da Gorilla em demo/ifood/evidence.
        const provider = getLLM()
        if (!provider || isInterviewMockForced()) {
          const perguntasFeitas = input.history.filter(
            (m) => m.role === 'assistant'
          ).length
          const turn = mockInterviewTurn(perguntasFeitas, input.forceComplete)
          for await (const token of mockInterviewTokens(turn.message)) {
            send({ type: 'token', value: token })
          }
          send({ type: 'turn', value: turn })
          controller.close()
          return
        }

        // 3. LLM com streaming e tool use no schema do InterviewTurn.
        const { events, result } = provider.streamStructured({
          system: buildInterviewSystemPrompt(input),
          messages: buildApiMessages(input.history),
          toolName: INTERVIEW_TOOL_NAME,
          toolDescription: interviewToolDescription,
          jsonSchema: interviewJsonSchema,
          maxTokens: 2048,
          streamField: 'message',
        })

        for await (const event of events) {
          if (event.value) {
            send({ type: 'token', value: event.value })
          }
        }

        // 4. Turno final com o JSON completo da tool use.
        const turnResult = interviewTurnSchema.safeParse(await result)
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
        const message =
          erro instanceof Error ? erro.message : 'Erro interno na entrevista.'
        send({ type: 'error', message })
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
