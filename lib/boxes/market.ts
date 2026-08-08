// lib/boxes/market.ts — caixa "Pesquisa de mercado".
// Roda DEPOIS da entrevista com as lideranças: o grill-me diz qual é a dor
// que a empresa acha que resolve; esta caixa vai ao mercado verificar se é
// isso mesmo que as pessoas estão dizendo.
//
// Sem GORILLA_API_KEY, cai no fixture de demo/ifood/evidence — mesma escolha
// de lib/boxes/ingest.ts, que cai no fallback local sem ANTHROPIC_API_KEY.
// O fixture é uma execução REAL gravada, com search_id verificável: dá
// determinismo de demo sem os custos de um mock inventado.

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  hasGorillaKey,
  readSearch,
  startSearch,
} from '@/lib/gorilla/client'
import { DIAGNOSTICO_SCHEMA, montarQuery } from '@/lib/gorilla/schema'
import { GorillaError, tierOf, type MarketPost, type MarketSignal } from '@/lib/gorilla/types'

const FIXTURE = join(process.cwd(), 'demo', 'ifood', 'evidence', 'gorilla-mercado-raw.json')

export interface MarketInput {
  /**
   * A dor em primeira pessoa, do jeito que o prospect falaria.
   * Vem do diagnóstico parcial da entrevista, não do nome da marca.
   *
   * Regra aprendida na execução real: buscar o nome da marca traz notícia e
   * assessoria de imprensa; buscar a dor traz gente. "taxa come minha margem"
   * rendeu 33 hot; "iFood" renderia press release.
   */
  dores: string[]
  since?: string
  limit?: number
}

export class MarketError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'MarketError'
    this.status = status
  }
}

/** Abre a busca. Devolve o id para o cliente fazer polling. */
export async function startMarketResearch(
  input: MarketInput
): Promise<{ searchId: string; startedAt: number; fromFixture: boolean }> {
  const query = montarQuery(input.dores)
  if (!query) {
    throw new MarketError('Informe ao menos uma dor para pesquisar.', 400)
  }

  if (!hasGorillaKey()) {
    return { searchId: 'fixture', startedAt: Date.now(), fromFixture: true }
  }

  try {
    const started = await startSearch(process.env.GORILLA_API_KEY!, {
      query,
      mode: 'ranked',
      since: input.since ?? '3mo',
      limit: input.limit ?? 80,
      customSchema: DIAGNOSTICO_SCHEMA,
    })
    return { ...started, fromFixture: false }
  } catch (error) {
    if (error instanceof GorillaError) throw new MarketError(error.message, error.status)
    throw new MarketError('Falha ao abrir a busca de mercado.', 502)
  }
}

/** Lê o estado da busca. Gratuito — pode ser chamado em loop. */
export async function readMarketResearch(
  searchId: string,
  startedAt?: number
): Promise<MarketSignal> {
  if (searchId === 'fixture' || !hasGorillaKey()) return loadFixture()

  try {
    return await readSearch(process.env.GORILLA_API_KEY!, searchId, startedAt)
  } catch (error) {
    if (error instanceof GorillaError) throw new MarketError(error.message, error.status)
    throw new MarketError('Falha ao ler a busca de mercado.', 502)
  }
}

/** Execução real gravada em 08/08/2026. search_id 4554b5ce…ab84. */
async function loadFixture(): Promise<MarketSignal> {
  let raw: {
    search_id: string
    query?: string
    results?: Array<Record<string, unknown>>
    total?: number
    credits_charged?: number
    credits_remaining?: number
    data?: unknown
  }
  try {
    raw = JSON.parse(await readFile(FIXTURE, 'utf-8'))
  } catch {
    throw new MarketError(
      'Sem GORILLA_API_KEY e sem fixture em demo/ifood/evidence. ' +
        'Defina a chave ou restaure o pacote de dados da demo.',
      500
    )
  }

  const buckets = { hot: 0, warm: 0, cold: 0 }
  const posts: MarketPost[] = []
  for (const row of raw.results ?? []) {
    const score = (row.result_score as number) ?? 0
    const tier = tierOf(score)
    buckets[tier] += 1
    if (tier === 'cold') continue
    posts.push({
      id: (row.id as string) ?? '',
      url: (row.url as string) ?? '',
      title: (row.title as string) ?? '',
      bodySnippet: (row.body_snippet as string) ?? '',
      author: (row.author as string) ?? '',
      source: (row.source as MarketPost['source']) ?? 'reddit',
      channel: (row.channel as string) ?? '',
      createdUtc: (row.created_utc as string) ?? '',
      numComments: (row.num_comments as number) ?? 0,
      resultScore: score,
      tier,
    })
  }
  posts.sort((a, b) => b.resultScore - a.resultScore)

  return {
    searchId: raw.search_id,
    query: raw.query ?? '',
    status: 'completed',
    total: raw.total ?? posts.length,
    posts,
    buckets,
    communities: [],
    sourcesDone: ['reddit', 'twitter', 'bluesky', 'linkedin', 'youtube'],
    creditsCharged: raw.credits_charged ?? 0,
    creditsRemaining: raw.credits_remaining ?? 0,
    durationMs: 74_931,
    data: raw.data ?? null,
    fromFixture: true,
  }
}
