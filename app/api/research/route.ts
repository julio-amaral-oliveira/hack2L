// app/api/research/route.ts — caixa "Aprender": análise de mercado via Gorilla
// em SSE. Recebe { digest, diagnosis }, gera a query de busca com o adapter de
// LLM (lib/llm), roda a busca real na Gorilla (lib/boxes/gorilla.ts) e emite um
// evento SSE por linha no formato `data: {...}\n\n`:
//   1. eventos `status` com progresso em PT-BR;
//   2. um evento `analysis` com o MarketAnalysis completo;
//   3. evento `error` em qualquer falha (incl. GORILLA_API_KEY ausente).
// O tipo ResearchEvent é definido aqui (não está em lib/contracts.ts).

import { z } from 'zod'

import type { BrandDigest, Diagnosis, MarketAnalysis } from '@/lib/contracts'
import {
  gorillaApiKey,
  mapMarketDataToAnalysis,
  runGorillaSearch,
} from '@/lib/boxes/gorilla'
import { buildResearchQuery } from '@/lib/boxes/researchQuery'

export const runtime = 'nodejs'
export const maxDuration = 300

export type ResearchEvent =
  | { type: 'status'; value: string }
  | { type: 'analysis'; value: MarketAnalysis }
  | { type: 'error'; message: string }

const researchRequestSchema = z.object({
  digest: z.object({
    resumo: z.string().min(1),
    fatos: z.array(z.string()),
    arquivos: z
      .array(z.object({ nome: z.string(), chars: z.number().nonnegative() }))
      .optional()
      .default([]),
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

export async function POST(request: Request): Promise<Response> {
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ResearchEvent) => {
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
        const parsed = researchRequestSchema.safeParse(body)
        if (!parsed.success) {
          send({
            type: 'error',
            message:
              'Corpo inválido: envie um JSON com { digest, diagnosis } conforme os contratos do app.',
          })
          controller.close()
          return
        }
        const input = parsed.data as {
          digest: BrandDigest
          diagnosis: Diagnosis
        }

        // 2. Chave da Gorilla obrigatória para a busca real.
        const apiKey = gorillaApiKey()
        if (!apiKey) {
          send({
            type: 'error',
            message:
              'GORILLA_API_KEY não configurada: defina a chave para a análise de mercado.',
          })
          controller.close()
          return
        }

        // 3. Query de busca via adapter de LLM.
        send({ type: 'status', value: 'Preparando a busca...' })
        const { assunto, queries } = await buildResearchQuery(input)

        // 4. Busca real na Gorilla com progresso ao vivo.
        send({ type: 'status', value: 'Pesquisando no mercado...' })
        const result = await runGorillaSearch({
          apiKey,
          query: queries.join('; '),
          onProgress: (done, total) => {
            if (total > 0) {
              send({
                type: 'status',
                value: `Pesquisando no mercado (${done}/${total} fontes)...`,
              })
            }
          },
        })

        // 5. Estrutura e entrega a análise.
        send({ type: 'status', value: 'Estruturando análise...' })
        const analysis = mapMarketDataToAnalysis({
          ...result.data,
          assunto,
        }, result.creditsCharged)

        send({ type: 'analysis', value: analysis })
        controller.close()
      } catch (erro) {
        console.error('POST /api/research falhou:', erro)
        const message =
          erro instanceof Error ? erro.message : 'Erro interno na análise de mercado.'
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
