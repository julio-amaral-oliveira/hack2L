// lib/video/index.ts — factory do adapter de vídeo.
// Ordem de resolução sem parâmetro: VIDEO_PROVIDER -> openai (se chave) -> mock.
// Com parâmetro explícito, resolve o provider pedido (erro se não disponível).

import { createGoogleProvider } from './google'
import { mockProvider } from './mock'
import { createOpenAIProvider } from './openai'
import { VideoProviderError } from './types'
import type { VideoProvider, VideoProviderId } from './types'

const PROVIDER_IDS: VideoProviderId[] = ['openai', 'google', 'mock']

function isProviderId(value: string | undefined): value is VideoProviderId {
  return value !== undefined && (PROVIDER_IDS as string[]).includes(value)
}

function isAvailable(id: VideoProviderId): boolean {
  if (id === 'mock') return true
  if (id === 'openai') return Boolean(process.env.OPENAI_API_KEY)
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
}

function resolveExplicit(id: VideoProviderId): VideoProvider {
  if (id === 'mock') return mockProvider
  if (id === 'openai') {
    if (process.env.OPENAI_API_KEY) {
      return createOpenAIProvider(process.env.OPENAI_API_KEY)
    }
    throw new VideoProviderError(
      'missing_key',
      'Sem chave do provider: OPENAI_API_KEY não definida.'
    )
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return createGoogleProvider(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  }
  throw new VideoProviderError(
    'missing_key',
    'Sem chave do provider: GOOGLE_GENERATIVE_AI_API_KEY não definida.'
  )
}

function resolveDefault(): VideoProvider {
  const fromEnv = process.env.VIDEO_PROVIDER
  if (isProviderId(fromEnv) && isAvailable(fromEnv)) {
    return resolveExplicit(fromEnv)
  }
  // NÃO cair no openai por padrão: ele aponta para o Sora 2, descontinuado em
  // 26/04/2026, com a API desligando em 24/09/2026. Ter OPENAI_API_KEY no
  // ambiente (para o LLM) fazia o vídeo escolher sozinho um provider morto e
  // quebrar a demo. Para usar Sora agora é preciso pedir explicitamente,
  // via VIDEO_PROVIDER=openai ou pelo seletor da interface.
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return createGoogleProvider(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  }
  return mockProvider
}

export function getProvider(id?: VideoProviderId): VideoProvider {
  if (id !== undefined) return resolveExplicit(id)
  return resolveDefault()
}

export function listAvailableProviders(): VideoProviderId[] {
  const available: VideoProviderId[] = []
  if (process.env.OPENAI_API_KEY) available.push('openai')
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) available.push('google')
  available.push('mock')
  return available
}
