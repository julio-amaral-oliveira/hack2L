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

export function getLLM(id?: LLMProviderId): LLMProvider | null {
  if (id !== undefined) return resolveExplicit(id)

  const fromEnv = process.env.LLM_PROVIDER
  if (isProviderId(fromEnv)) {
    // LLM_PROVIDER força a escolha; sem a chave correspondente, erro claro.
    return resolveExplicit(fromEnv)
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return createAnthropicProvider(process.env.ANTHROPIC_API_KEY)
  }
  if (process.env.OPENAI_API_KEY) {
    return createOpenAIProvider(process.env.OPENAI_API_KEY)
  }
  return null
}
