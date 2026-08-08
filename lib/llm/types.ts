// lib/llm/types.ts — tipos do adapter de LLM + helpers compartilhados.
//
// Os helpers de runtime vivem aqui (e não em index.ts) para que os dois
// providers (anthropic.ts e openai.ts) possam importá-los sem criar ciclo de
// importação com o factory index.ts. Padrão espelhado de lib/video/.

export type LLMProviderId = 'anthropic' | 'openai'

/** Pedido estruturado via tool use, neutro de provider. */
export interface StructuredRequest {
  system: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  toolName: string
  toolDescription: string
  jsonSchema: Record<string, unknown>
  maxTokens?: number
}

export interface LLMProvider {
  id: LLMProviderId
  generateStructured(req: StructuredRequest): Promise<unknown>
  streamStructured(req: StructuredRequest & { streamField: string }): {
    events: AsyncIterable<{ type: 'token'; value: string }>
    result: Promise<unknown>
  }
}

// --- Detecção de erro de quota (conta sem crédito) ---------------------------
//
// True quando a conta do provider está sem crédito: status HTTP 429, ou o
// código/mensagem do erro menciona insufficient_quota, credit_balance_exhausted
// ou "no credits" (case-insensitive). Cobre os dois formatos que os providers
// lançam (lib/llm/openai.ts e lib/llm/anthropic.ts): o erro nativo do SDK
// (com status e code próprios) e o Error convertido em PT-BR, cuja mensagem
// embute o status "(HTTP 429)" e o texto original do SDK.

export function isQuotaError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false
  const erro = error as { status?: unknown; code?: unknown; message?: unknown }
  if (erro.status === 429) return true
  const termos = ['insufficient_quota', 'credit_balance_exhausted', 'no credits']
  const texto = [erro.message, erro.code]
    .filter((valor): valor is string => typeof valor === 'string')
    .join(' ')
    .toLowerCase()
  return termos.some((termo) => texto.includes(termo))
}

// --- Extração incremental de campos string em JSON parcial -------------------

/**
 * Lê o valor do campo string `field` de um JSON parcial (tolerante a JSON
 * incompleto: o campo pode ainda não ter fechado aspas). Decodifica escapes
 * JSON (`\"`, `\\`, `\n`, `\t`, `\r`, `\b`, `\f`, `\uXXXX`).
 * Lógica reaproveitada da antiga app/api/interview/route.ts.
 */
export function extractStringField(partialJson: string, field: string): string {
  const keyMatch = new RegExp(`"${field}"\\s*:`).exec(partialJson)
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

/**
 * Cria um extrator de campo com estado: cada chamada com o JSON parcial
 * acumulado devolve apenas o trecho NOVO (decodificado) daquele campo desde a
 * última chamada. Usado no streaming de tool use (Anthropic input_json_delta,
 * OpenAI delta.tool_calls[].function.arguments) para emitir tokens ao vivo.
 */
export function createFieldExtractor(
  streamField: string
): (partialJson: string) => string {
  let lastValueLength = 0
  return (partialJson: string) => {
    const value = extractStringField(partialJson, streamField)
    if (value.length <= lastValueLength) return ''
    const fresh = value.slice(lastValueLength)
    lastValueLength = value.length
    return fresh
  }
}

// --- Deferred: promise + resolvers (resultado do streaming) ------------------

export interface Deferred<T> {
  result: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const result = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { result, resolve, reject }
}
