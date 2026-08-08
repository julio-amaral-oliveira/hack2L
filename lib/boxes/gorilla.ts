// lib/boxes/gorilla.ts — caixa "Aprender": cliente da Gorilla API para a
// análise de mercado. Base https://usegorilla.app/v1 com x-api-key e um
// User-Agent de navegador (a API bloqueia clientes sem UA real; o fetch do
// Node passa no Cloudflare com estes headers).
// Fluxo: POST /v2-search-stream cria a busca; poll de GET
// /v2-search-stream?id=<search_id> a cada 3 s até status != "running" (teto
// 240 s); o campo `data` da resposta final é o objeto preenchido conforme o
// custom_schema (mesma estrutura de demo/ifood/evidence/reproduzir-mercado.py).
// Mapeia a saída para MarketAnalysis (lib/contracts.ts, imutável).

import type {
  AwarenessLevel,
  MarketAnalysis,
  MarketConcorrente,
  MarketEvidence,
} from '@/lib/contracts'

export const GORILLA_BASE_URL = 'https://usegorilla.app/v1'
export const GORILLA_POLL_INTERVAL_MS = 3000
export const GORILLA_POLL_TIMEOUT_MS = 240_000
export const GORILLA_REQUEST_TIMEOUT_MS = 120_000

// UA de navegador real: a API (atrás de Cloudflare) rejeita clients sem UA.
export const GORILLA_BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const GORILLA_FALLBACK_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

// --- custom_schema (estrutura copiada de reproduzir-mercado.py) --------------

function evidenceArray(desc: string): Record<string, unknown> {
  return {
    type: 'array',
    description: desc,
    items: {
      type: 'object',
      properties: {
        texto: { type: 'string' },
        evidencia_url: { type: 'string' },
      },
      required: ['texto', 'evidencia_url'],
      additionalProperties: false,
    },
  }
}

/** Schema JSON de análise de mercado, idêntico ao usado nas evidências iFood. */
export const MARKET_CUSTOM_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    prospect: {
      type: 'string',
      description: 'Quem e o prospect, em uma frase',
    },
    desejo_dominante: { type: 'string' },
    estado_de_consciencia: {
      type: 'string',
      enum: [
        'inconsciente',
        'consciente_do_problema',
        'consciente_da_solucao',
        'consciente_do_produto',
        'mais_consciente',
      ],
    },
    estado_de_consciencia_justificativa: { type: 'string' },
    sofisticacao_do_mercado: {
      type: 'integer',
      description: 'Estagio 1 a 5 da rubrica de Eugene Schwartz',
    },
    sofisticacao_justificativa: { type: 'string' },
    crencas: evidenceArray('Crencas que o prospect ja tem'),
    objecoes: evidenceArray('Objecoes que impedem a acao'),
    mencoes_concorrente: evidenceArray('Concorrentes citados e o motivo'),
    linguagem_do_prospect: {
      type: 'array',
      description: 'Frases literais que o prospect usa',
      items: { type: 'string' },
    },
    mecanismo_sugerido: {
      type: 'string',
      description:
        'Mecanismo novo que responde ao estagio de sofisticacao, sem repetir claim ja feito',
    },
    prova: evidenceArray('Provas disponiveis para sustentar o mecanismo'),
  },
  required: [
    'prospect',
    'desejo_dominante',
    'estado_de_consciencia',
    'sofisticacao_do_mercado',
    'crencas',
    'objecoes',
    'mencoes_concorrente',
    'linguagem_do_prospect',
    'mecanismo_sugerido',
    'prova',
  ],
  additionalProperties: false,
}

// --- Mapeamento para o contrato MarketAnalysis ---------------------------------

/** estado_de_consciencia PT (schema Gorilla) -> AwarenessLevel do contrato. */
const AWARENESS_MAP: Record<string, AwarenessLevel> = {
  inconsciente: 'unaware',
  consciente_do_problema: 'problem_aware',
  consciente_da_solucao: 'solution_aware',
  consciente_do_produto: 'product_aware',
  mais_consciente: 'most_aware',
}

/** sofisticacao 1-5 (Schwartz) -> baixa | media | alta do contrato. */
export function sofisticacaoToLabel(value: number): 'baixa' | 'media' | 'alta' {
  if (value <= 2) return 'baixa'
  if (value <= 4) return 'media'
  return 'alta'
}

function toEvidence(items: unknown): MarketEvidence[] {
  if (!Array.isArray(items)) return []
  return items
    .filter(
      (item): item is { texto?: unknown; evidencia_url?: unknown } =>
        typeof item === 'object' && item !== null
    )
    .map((item) => ({
      texto: typeof item.texto === 'string' ? item.texto : '',
      evidencia_url: typeof item.evidencia_url === 'string' ? item.evidencia_url : '',
    }))
    .filter((item) => item.texto !== '')
}

function toConcorrentes(items: unknown): MarketConcorrente[] {
  if (!Array.isArray(items)) return []
  return items
    .filter(
      (item): item is { concorrente?: unknown; motivo?: unknown; evidencia_url?: unknown } =>
        typeof item === 'object' && item !== null
    )
    .map((item) => ({
      concorrente: typeof item.concorrente === 'string' ? item.concorrente : '',
      motivo: typeof item.motivo === 'string' ? item.motivo : '',
      evidencia_url:
        typeof item.evidencia_url === 'string' ? item.evidencia_url : '',
    }))
    .filter((item) => item.concorrente !== '')
}

/** Monta o resumo da análise a partir das justificativas preenchidas no data. */
function buildResumo(data: Record<string, unknown>): string {
  const parts = [
    typeof data.estado_de_consciencia_justificativa === 'string'
      ? data.estado_de_consciencia_justificativa
      : '',
    typeof data.sofisticacao_justificativa === 'string'
      ? data.sofisticacao_justificativa
      : '',
  ].filter((part) => part.trim() !== '')
  if (parts.length > 0) return parts.join(' ')
  return typeof data.prospect === 'string' ? data.prospect : ''
}

/** Mapeia o objeto `data` do custom_schema para MarketAnalysis do contrato. */
export function mapMarketDataToAnalysis(
  data: Record<string, unknown>,
  creditosGastos: number
): MarketAnalysis {
  const rawAwareness =
    typeof data.estado_de_consciencia === 'string'
      ? data.estado_de_consciencia
      : ''
  const rawSofisticacao =
    typeof data.sofisticacao_do_mercado === 'number'
      ? data.sofisticacao_do_mercado
      : 3

  return {
    assunto:
      typeof data.assunto === 'string'
        ? data.assunto
        : typeof data.desejo_dominante === 'string'
          ? data.desejo_dominante
          : '',
    resumo: buildResumo(data),
    prospect: typeof data.prospect === 'string' ? data.prospect : '',
    desejoDominante:
      typeof data.desejo_dominante === 'string' ? data.desejo_dominante : '',
    estadoDeConsciencia: AWARENESS_MAP[rawAwareness] ?? 'solution_aware',
    sofisticacaoMercado: sofisticacaoToLabel(rawSofisticacao),
    crencas: toEvidence(data.crencas),
    objeicoes: toEvidence(data.objecoes),
    concorrentes: toConcorrentes(data.mencoes_concorrente),
    linguagem: Array.isArray(data.linguagem_do_prospect)
      ? data.linguagem_do_prospect.filter(
          (item): item is string => typeof item === 'string'
        )
      : [],
    mecanismoSugerido:
      typeof data.mecanismo_sugerido === 'string'
        ? data.mecanismo_sugerido
        : '',
    prova: toEvidence(data.prova),
    creditosGastos,
  }
}

// --- HTTP (fetch do Node com retry de UA contra Cloudflare) --------------------

type GorillaHeaders = Record<string, string>

function buildHeaders(apiKey: string, ua: string): GorillaHeaders {
  return {
    'x-api-key': apiKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': ua,
  }
}

/** Erro de Cloudflare/HTTP com detalhes úteis para ajuste de headers/UA. */
export class GorillaHttpError extends Error {
  status: number
  body: string

  constructor(status: number, body: string) {
    const detail = body.slice(0, 400)
    const isCloudflare = /cloudflare|1010|cf-/i.test(detail)
    super(
      isCloudflare
        ? `A Gorilla bloqueou a requisição (Cloudflare, HTTP ${status}). ${detail}`
        : `A Gorilla respondeu HTTP ${status}. ${detail}`
    )
    this.name = 'GorillaHttpError'
    this.status = status
    this.body = body
  }
}

async function gorillaFetch(
  apiKey: string,
  url: string,
  init: { method: string; body?: string }
): Promise<{ status: number; body: unknown; rawText: string }> {
  const uas = [GORILLA_BROWSER_UA, GORILLA_FALLBACK_UA]
  let lastError: unknown = null

  for (const ua of uas) {
    try {
      const res = await fetch(url, {
        method: init.method,
        headers: buildHeaders(apiKey, ua),
        body: init.body,
        signal: AbortSignal.timeout(GORILLA_REQUEST_TIMEOUT_MS),
      })
      const rawText = await res.text()
      if (!res.ok) {
        // Cloudflare 403/1010: tenta o próximo UA antes de desistir.
        if (/cloudflare|1010|cf-/i.test(rawText)) {
          lastError = new GorillaHttpError(res.status, rawText)
          continue
        }
        throw new GorillaHttpError(res.status, rawText)
      }
      let body: unknown
      try {
        body = JSON.parse(rawText)
      } catch {
        body = { rawText }
      }
      return { status: res.status, body, rawText }
    } catch (erro) {
      if (erro instanceof GorillaHttpError) {
        lastError = erro
        continue
      }
      throw erro
    }
  }

  throw lastError ?? new Error('Falha ao falar com a Gorilla API.')
}

export interface GorillaSearchInput {
  apiKey: string
  query: string
  customSchema?: Record<string, unknown>
  since?: string
  limit?: number
  mode?: string
  /** Chamado a cada poll com fontes já processadas e o total. */
  onProgress?: (done: number, total: number) => void
}

export interface GorillaSearchResult {
  data: Record<string, unknown>
  creditsCharged: number
  searchId: string
}

/**
 * Roda a busca de mercado na Gorilla: POST cria a busca, poll a cada 3 s até
 * concluir (teto 240 s) e devolve o objeto `data` do custom_schema + créditos
 * gastos. Lança Error com mensagem clara em PT-BR em falhas de rede, timeout
 * ou resposta sem dados.
 */
export async function runGorillaSearch(
  input: GorillaSearchInput
): Promise<GorillaSearchResult> {
  const { apiKey, query } = input

  const postBody = JSON.stringify({
    query,
    mode: input.mode ?? 'ranked',
    since: input.since ?? '3mo',
    limit: input.limit ?? 80,
    custom_schema: input.customSchema ?? MARKET_CUSTOM_SCHEMA,
  })

  const created = await gorillaFetch(apiKey, `${GORILLA_BASE_URL}/v2-search-stream`, {
    method: 'POST',
    body: postBody,
  })

  const createdBody = created.body as { search_id?: unknown; errors?: unknown }
  const searchId = createdBody?.search_id
  if (typeof searchId !== 'string' || searchId.length === 0) {
    const detail = JSON.stringify(created.body).slice(0, 300)
    throw new Error(`A Gorilla não devolveu um search_id. ${detail}`)
  }

  const deadline = Date.now() + GORILLA_POLL_TIMEOUT_MS
  let final: unknown = null
  let pollErrors: string[] = []

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, GORILLA_POLL_INTERVAL_MS))

    const polled = await gorillaFetch(
      apiKey,
      `${GORILLA_BASE_URL}/v2-search-stream?id=${encodeURIComponent(searchId)}`,
      { method: 'GET' }
    )
    const pollBody = polled.body as {
      status?: unknown
      data?: unknown
      done_sources?: unknown
      pending_sources?: unknown
      total?: unknown
      errors?: unknown
    }

    if (pollBody?.total !== undefined && pollBody?.done_sources !== undefined) {
      const total = typeof pollBody.total === 'number' ? pollBody.total : 0
      const done = typeof pollBody.done_sources === 'number' ? pollBody.done_sources : 0
      input.onProgress?.(done, total)
    }

    const status = typeof pollBody?.status === 'string' ? pollBody.status : ''
    if (status === '' || status === 'running') continue

    if (Array.isArray(pollBody?.errors)) {
      pollErrors = pollBody.errors.map((e) =>
        typeof e === 'string' ? e : JSON.stringify(e)
      )
    }
    final = pollBody
    break
  }

  if (final === null) {
    throw new Error(
      'A pesquisa de mercado estourou o tempo (240 s). Tente novamente.'
    )
  }

  const finalBody = final as {
    data?: unknown
    credits_charged?: unknown
  }
  if (finalBody.data === null || finalBody.data === undefined) {
    const detail =
      pollErrors.length > 0
        ? pollErrors.join('; ')
        : JSON.stringify(final).slice(0, 300)
    throw new Error(`A pesquisa de mercado terminou sem dados. ${detail}`)
  }

  const creditsCharged =
    typeof finalBody.credits_charged === 'number'
      ? finalBody.credits_charged
      : 0

  if (typeof finalBody.data !== 'object' || finalBody.data === null) {
    throw new Error('A pesquisa de mercado devolveu dados inválidos.')
  }

  return {
    data: finalBody.data as Record<string, unknown>,
    creditsCharged,
    searchId,
  }
}

/** Exporta a chave da Gorilla do ambiente (string vazia se ausente). */
export function gorillaApiKey(): string {
  return process.env.GORILLA_API_KEY?.trim() ?? ''
}

export function hasGorillaKey(): boolean {
  return gorillaApiKey() !== ''
}
