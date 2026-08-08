// app/api/research/route.ts — caixa "Aprender": análise de mercado via Gorilla
// em SSE. Recebe { digest, diagnosis }, gera a query de busca com o adapter de
// LLM (lib/llm), roda a busca real na Gorilla (lib/boxes/gorilla.ts) e emite um
// evento SSE por linha no formato `data: {...}\n\n`:
//   1. eventos `status` com progresso em PT-BR;
//   2. um evento `analysis` com o MarketAnalysis completo;
//   3. evento `error` só em falha irrecuperável (corpo inválido).
// Sem GORILLA_API_KEY, com MOCK_RESEARCH=1, ou se a busca ao vivo falhar, a
// rota cai na análise gravada de demo/ifood/evidence e segue — a demo nunca
// morre nesta caixa. Ver lib/mocks/research.ts.
// O tipo ResearchEvent é definido aqui (não está em lib/contracts.ts).

import { z } from 'zod'

import type { BrandDigest, Diagnosis, MarketAnalysis } from '@/lib/contracts'
import {
  gorillaApiKey,
  mapMarketDataToAnalysis,
  runGorillaSearch,
} from '@/lib/boxes/gorilla'
import { buildResearchQuery } from '@/lib/boxes/researchQuery'
import { isResearchMockForced, mockResearch } from '@/lib/mocks/research'

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

        // 2. Query de busca via adapter de LLM.
        send({ type: 'status', value: 'Preparando a busca...' })
        const { assunto, queries } = await buildResearchQuery(input)

        // 3. Busca real na Gorilla — com rede de segurança.
        // Esta é a caixa mais frágil do pipeline: API externa, créditos
        // finitos, rate limit e timeout de 240s. Sem chave, sem crédito, ou
        // com a rede do evento ruim, a demo morria aqui no meio. Agora cai no
        // fixture de demo/ifood/evidence — execução real, search_id
        // verificável — e a apresentação segue.
        const apiKey = gorillaApiKey()

        if (!apiKey || isResearchMockForced()) {
          send({
            type: 'status',
            value: !apiKey
              ? 'Sem chave da Gorilla — usando a análise gravada...'
              : 'Modo demo: usando a análise gravada...',
          })
          send({ type: 'analysis', value: await mockResearch(assunto) })
          controller.close()
          return
        }

        let analysis
        try {
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
          send({ type: 'status', value: 'Estruturando análise...' })
          analysis = mapMarketDataToAnalysis(
            { ...result.data, assunto },
            result.creditsCharged
          )
        } catch (erroBusca) {
          console.error('Gorilla falhou; caindo na análise gravada:', erroBusca)
          send({
            type: 'status',
            value: 'A busca ao vivo falhou — usando a análise gravada...',
          })
          analysis = await mockResearch(assunto)
        }

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
