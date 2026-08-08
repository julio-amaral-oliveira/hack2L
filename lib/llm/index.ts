// lib/llm/index.ts — factory do adapter de LLM.
// Ordem de resolução sem parâmetro: LLM_PROVIDER -> anthropic (se chave) ->
// openai (se chave) -> nenhum (getLLM devolve null). Com parâmetro explícito,
// resolve o provider pedido (erro claro se a chave não existir).
// Padrão espelhado de lib/video/index.ts.

import { createAnthropicProvider } from './anthropic'
import { createOpenAIProvider } from './openai'
import type { LLMProvider, LLMProviderId } from './types'

export type { LLMProvider, LLMProviderId, StructuredRequest } from './types'

const PROVIDER_IDS: LLMProviderId[] = ['anthropic', 'openai']

function isProviderId(value: string | undefined): value is LLMProviderId {
  return value !== undefined && (PROVIDER_IDS as string[]).includes(value)
}

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}

export function hasAnyLLM(): boolean {
  return hasAnthropicKey() || hasOpenAIKey()
}

function resolveExplicit(id: LLMProviderId): LLMProvider {
  if (id === 'anthropic') {
    if (process.env.ANTHROPIC_API_KEY) {
      return createAnthropicProvider(process.env.ANTHROPIC_API_KEY)
    }
    throw new Error('Sem chave do provider de LLM: ANTHROPIC_API_KEY não definida.')
  }
  if (process.env.OPENAI_API_KEY) {
    return createOpenAIProvider(process.env.OPENAI_API_KEY)
  }
  throw new Error('Sem chave do provider de LLM: OPENAI_API_KEY não definida.')
}

/**
 * Resolve o provider de LLM.
 *
 * Sem `id`, NUNCA lança: o contrato de retorno é `LLMProvider | null`, e todos
 * os callers dependem disso — eles fazem `if (!provider)` e caem no mock. Se
 * esta função lançasse, a exceção passaria por cima desse guard e o mock nunca
 * assumiria. Era exatamente o que acontecia com `LLM_PROVIDER=anthropic`
 * definido sem `ANTHROPIC_API_KEY`: a primeira caixa do pipeline devolvia 500
 * pedindo a chave, e nada depois rodava.
 *
 * Um `LLM_PROVIDER` apontando para provider sem chave agora vira aviso no log
 * e cai para o outro provider disponível, depois para null (mock).
 *
 * Com `id` explícito o comportamento é outro de propósito: quem pede um
 * provider pelo nome quer saber se ele não está disponível.
 */
export function getLLM(id?: LLMProviderId): LLMProvider | null {
  if (id !== undefined) return resolveExplicit(id)

  const fromEnv = process.env.LLM_PROVIDER
  if (isProviderId(fromEnv)) {
    if (isAvailable(fromEnv)) return resolveExplicit(fromEnv)
    console.warn(
      `LLM_PROVIDER="${fromEnv}" está definido, mas a chave correspondente não. ` +
        'Ignorando e resolvendo pelo que estiver disponível.'
    )
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return createAnthropicProvider(process.env.ANTHROPIC_API_KEY)
  }
  if (process.env.OPENAI_API_KEY) {
    return createOpenAIProvider(process.env.OPENAI_API_KEY)
  }
  return null
}

/** Existe chave para este provider? */
function isAvailable(id: LLMProviderId): boolean {
  return id === 'anthropic' ? hasAnthropicKey() : hasOpenAIKey()
}

/**
 * Igual a getLLM(), mas blindado: qualquer falha inesperada na construção do
 * provider também vira null, em vez de derrubar a caixa que chamou.
 * Use nos pontos onde não há mock a jusante para segurar o erro.
 */
export function getLLMSafe(): LLMProvider | null {
  try {
    return getLLM()
  } catch (error) {
    console.warn('Falha ao resolver o provider de LLM; seguindo sem ele:', error)
    return null
  }
}
