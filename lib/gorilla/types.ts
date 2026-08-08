// lib/gorilla/types.ts — tipos da Gorilla API e do sinal de mercado.
// A Gorilla lê Reddit, X, Bluesky, LinkedIn e YouTube e devolve posts com
// score de relevância. Usamos para responder: como a marca (e a dor que ela
// resolve) está sendo comentada no mercado agora.

/** Fontes indexadas pela Gorilla. */
export type GorillaSource =
  | 'reddit'
  | 'twitter'
  | 'bluesky'
  | 'linkedin'
  | 'youtube'

/** ranked usa LLM por lead; raw só recência + engajamento. */
export type GorillaMode = 'ranked' | 'raw'

export type GorillaStatus = 'running' | 'completed' | 'failed'

/** Faixa derivada de resultScore. A API NÃO devolve esse campo. */
export type SignalTier = 'hot' | 'warm' | 'cold'

export interface GorillaSearchRequest {
  /** Máx. 500 chars. Separe termos com ';' para sub-queries paralelas. */
  query: string
  mode?: GorillaMode
  /** '24h' | '7d' | '3mo' | 'all' | data ISO. */
  since?: string
  /** 1..200 */
  limit?: number
  sources?: GorillaSource[]
  /** Até 10 subreddits ou handles por fonte. */
  channels?: Partial<Record<GorillaSource, string[]>>
  /** JSON Schema em modo strict. Preenche `data` sem custo extra de créditos. */
  customSchema?: Record<string, unknown>
}

/** Uma linha de resultado, já normalizada. */
export interface MarketPost {
  id: string
  url: string
  title: string
  bodySnippet: string
  author: string
  source: GorillaSource
  channel: string
  createdUtc: string
  numComments: number
  /** 0..1 — relevância. Ordena a lista. */
  resultScore: number
  /** Derivado de resultScore, não vem da API. */
  tier: SignalTier
}

/** Comunidade onde a conversa acontece. Vira canal de segmentação. */
export interface MarketCommunity {
  id: string
  label: string
  matchingPosts: number
  hotPosts: number
}

export interface MarketSignal {
  searchId: string
  query: string
  status: GorillaStatus
  /** Total bruto retornado, incluindo cold. */
  total: number
  /** Só hot + warm, ordenados por resultScore. */
  posts: MarketPost[]
  buckets: Record<SignalTier, number>
  communities: MarketCommunity[]
  sourcesDone: GorillaSource[]
  creditsCharged: number
  creditsRemaining: number
  durationMs: number
  /** Saída do customSchema, quando enviado. */
  data: unknown | null
  /** true quando veio do fixture em demo/ifood, sem chamar a API. */
  fromFixture: boolean
}

export interface GorillaBilling {
  plan: string
  total: number
}

export type GorillaErrorCode =
  | 'missing_key'
  | 'invalid_auth'
  | 'insufficient_credits'
  | 'rate_limit'
  | 'blocked'
  | 'timeout'
  | 'upstream'

export class GorillaError extends Error {
  code: GorillaErrorCode
  status: number

  constructor(code: GorillaErrorCode, message: string, status = 500) {
    super(message)
    this.name = 'GorillaError'
    this.code = code
    this.status = status
  }
}

/** hot ≥ 0.7 · warm 0.4–0.7 · cold < 0.4 */
export function tierOf(resultScore: number): SignalTier {
  if (resultScore >= 0.7) return 'hot'
  if (resultScore >= 0.4) return 'warm'
  return 'cold'
}
