// lib/gorilla/client.ts — cliente da Gorilla API.
// Padrão espelhado de lib/video/index.ts e lib/llm/index.ts: factory que
// resolve por env var e devolve null quando não há chave.
//
// A busca é assíncrona por natureza: o POST abre a busca e devolve um
// search_id; o GET faz polling até status !== 'running'. Uma execução real
// levou 75s e outra 84s — por isso as duas fases ficam expostas
// separadamente, para a rota nunca estourar o maxDuration da Vercel.

import {
  GorillaError,
  tierOf,
  type GorillaBilling,
  type GorillaSearchRequest,
  type GorillaSource,
  type GorillaStatus,
  type MarketCommunity,
  type MarketPost,
  type MarketSignal,
} from './types'

const BASE = process.env.GORILLA_API_BASE ?? 'https://usegorilla.app/v1'

// O Cloudflare da Gorilla devolve 1010 para clientes sem User-Agent de
// browser (o urllib do Python apanha; curl passa). fetch do Node manda um UA
// próprio, então declaramos um explicitamente.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export function hasGorillaKey(): boolean {
  return Boolean(process.env.GORILLA_API_KEY)
}

function headers(key: string): HeadersInit {
  return {
    'x-api-key': key,
    'Content-Type': 'application/json',
    'User-Agent': UA,
    Accept: 'application/json',
  }
}

function mapError(status: number, body: string): GorillaError {
  if (status === 401 || status === 403) {
    if (body.includes('1010')) {
      return new GorillaError(
        'blocked',
        'A Gorilla bloqueou o cliente HTTP (Cloudflare 1010). Verifique o User-Agent.',
        502
      )
    }
    return new GorillaError('invalid_auth', 'GORILLA_API_KEY inválida ou revogada.', 401)
  }
  if (status === 402) {
    return new GorillaError('insufficient_credits', 'Créditos da Gorilla esgotados.', 402)
  }
  if (status === 429) {
    return new GorillaError('rate_limit', 'Limite de requisições da Gorilla atingido.', 429)
  }
  return new GorillaError('upstream', `Gorilla respondeu ${status}: ${body.slice(0, 200)}`, 502)
}

async function call<T>(path: string, key: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: headers(key),
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  if (!res.ok) throw mapError(res.status, await res.text().catch(() => ''))
  return (await res.json()) as T
}

/** Saldo e plano. Chamada gratuita — bom para health check. */
export async function billingStatus(key: string): Promise<GorillaBilling> {
  const raw = await call<{ plan: string; balance: { total: number } }>(
    '/billing-status',
    key
  )
  return { plan: raw.plan, total: raw.balance?.total ?? 0 }
}

/** Fase 1: abre a busca. Retorna o search_id imediatamente. */
export async function startSearch(
  key: string,
  req: GorillaSearchRequest
): Promise<{ searchId: string; startedAt: number }> {
  if (!req.query.trim()) {
    throw new GorillaError('upstream', 'Query vazia.', 400)
  }
  const raw = await call<{ search_id?: string }>('/v2-search-stream', key, {
    query: req.query.slice(0, 500),
    mode: req.mode ?? 'ranked',
    since: req.since ?? '3mo',
    limit: req.limit ?? 80,
    ...(req.sources ? { sources: req.sources } : {}),
    ...(req.channels ? { channels: req.channels } : {}),
    ...(req.customSchema ? { custom_schema: req.customSchema } : {}),
  })
  if (!raw.search_id) {
    throw new GorillaError('upstream', 'A Gorilla não devolveu search_id.', 502)
  }
  return { searchId: raw.search_id, startedAt: Date.now() }
}

interface RawRow {
  id?: string
  url?: string
  title?: string
  body_snippet?: string
  author?: string
  source?: string
  channel?: string
  created_utc?: string
  num_comments?: number
  result_score?: number
}

interface RawResponse {
  search_id: string
  query?: string
  status: GorillaStatus
  results?: RawRow[]
  total?: number
  done_sources?: string[]
  communities?: { subreddits?: RawCommunity[]; youtube_channels?: RawCommunity[] }
  credits_charged?: number
  credits_remaining?: number
  data?: unknown
}

interface RawCommunity {
  id?: string
  label?: string
  matching_posts?: number
  hot_posts?: number
}

function normalizeCommunities(raw: RawResponse['communities']): MarketCommunity[] {
  const groups = [...(raw?.subreddits ?? []), ...(raw?.youtube_channels ?? [])]
  return groups.map((c) => ({
    id: c.id ?? '',
    label: c.label ?? c.id ?? '',
    matchingPosts: c.matching_posts ?? 0,
    hotPosts: c.hot_posts ?? 0,
  }))
}

/**
 * Fase 2: lê o estado da busca. Chamada gratuita — pode ser chamada em loop
 * pelo cliente a cada ~1,5s sem gastar crédito.
 *
 * Descarta cold: em modo ranked cold é grátis e é ruído (numa execução real,
 * 653 dos 719 resultados eram cold).
 */
export async function readSearch(
  key: string,
  searchId: string,
  startedAt = Date.now()
): Promise<MarketSignal> {
  const raw = await call<RawResponse>(
    `/v2-search-stream?id=${encodeURIComponent(searchId)}`,
    key
  )

  const buckets = { hot: 0, warm: 0, cold: 0 }
  const posts: MarketPost[] = []

  for (const row of raw.results ?? []) {
    const score = row.result_score ?? 0
    const tier = tierOf(score)
    buckets[tier] += 1
    if (tier === 'cold') continue
    posts.push({
      id: row.id ?? row.url ?? '',
      url: row.url ?? '',
      title: row.title ?? '',
      bodySnippet: row.body_snippet ?? '',
      author: row.author ?? '',
      source: (row.source ?? 'reddit') as GorillaSource,
      channel: row.channel ?? '',
      createdUtc: row.created_utc ?? '',
      numComments: row.num_comments ?? 0,
      resultScore: score,
      tier,
    })
  }
  posts.sort((a, b) => b.resultScore - a.resultScore)

  return {
    searchId: raw.search_id,
    query: raw.query ?? '',
    status: raw.status,
    total: raw.total ?? 0,
    posts,
    buckets,
    communities: normalizeCommunities(raw.communities),
    sourcesDone: (raw.done_sources ?? []) as GorillaSource[],
    creditsCharged: raw.credits_charged ?? 0,
    creditsRemaining: raw.credits_remaining ?? 0,
    durationMs: Date.now() - startedAt,
    data: raw.data ?? null,
    fromFixture: false,
  }
}

/**
 * Conveniência para scripts e jobs: abre e faz o polling até terminar.
 * NÃO use dentro de uma rota da Vercel — leva 75s a 85s e estoura o
 * maxDuration. Nas rotas, use startSearch + readSearch.
 */
export async function search(
  key: string,
  req: GorillaSearchRequest,
  opts: { intervalMs?: number; timeoutMs?: number } = {}
): Promise<MarketSignal> {
  const interval = opts.intervalMs ?? 1500
  const timeout = opts.timeoutMs ?? 180_000
  const { searchId, startedAt } = await startSearch(key, req)

  for (;;) {
    await new Promise((r) => setTimeout(r, interval))
    const signal = await readSearch(key, searchId, startedAt)
    if (signal.status !== 'running') return signal
    if (Date.now() - startedAt > timeout) {
      throw new GorillaError('timeout', `Busca ${searchId} não concluiu em ${timeout}ms.`, 504)
    }
  }
}
