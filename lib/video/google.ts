// lib/video/google.ts — provider de vídeo via Google (Veo).
// API real (@google/genai 2.16.0): ai.models.generateVideos({ model, prompt,
// config }) -> GenerateVideosOperation; ai.operations.getVideosOperation({ operation })
// para poll; o vídeo sai em video.videoBytes (base64) ou video.uri.

import { GoogleGenAI } from '@google/genai'
import type { GenerateVideosOperation, Video } from '@google/genai'

import {
  errorMessage,
  saveVideoBuffer,
  sleep,
  VideoProviderError,
} from './types'
import type { VideoGenInput, VideoGenResult, VideoProvider } from './types'

const DEFAULT_MODEL = 'veo-3'
const POLL_INTERVAL_MS = 5_000
const POLL_TIMEOUT_MS = 240_000
const MAX_DURATION_SEG = 8 // Veo 3 gera clips de até 8 segundos

async function downloadVideoBytes(
  ai: GoogleGenAI,
  video: Video
): Promise<Uint8Array | null> {
  if (video.videoBytes) return Buffer.from(video.videoBytes, 'base64')
  if (!video.uri) return null
  try {
    return await ai.fileSearchStores.downloadMedia(video.uri)
  } catch {
    // fallback: baixa o URI direto com alt=media
  }
  try {
    const response = await fetch(`${video.uri}?alt=media`)
    if (!response.ok) return null
    return new Uint8Array(await response.arrayBuffer())
  } catch {
    return null
  }
}

export function createGoogleProvider(apiKey: string): VideoProvider {
  const ai = new GoogleGenAI({ apiKey })

  return {
    id: 'google',
    async generate(input: VideoGenInput): Promise<VideoGenResult> {
      const model = process.env.GOOGLE_VIDEO_MODEL?.trim() || DEFAULT_MODEL
      let operation: GenerateVideosOperation
      try {
        operation = await ai.models.generateVideos({
          model,
          prompt: input.prompt,
          config: {
            numberOfVideos: 1,
            aspectRatio: '9:16',
            resolution: '720p',
            durationSeconds: Math.min(
              Math.max(input.duracaoSeg, 4),
              MAX_DURATION_SEG
            ),
          },
        })
      } catch (error) {
        throw new VideoProviderError(
          'provider_failed',
          `Falha no provider: ${errorMessage(error)}`
        )
      }

      try {
        const deadline = Date.now() + POLL_TIMEOUT_MS
        for (;;) {
          if (operation.done) break
          if (Date.now() >= deadline) {
            throw new VideoProviderError('timeout', 'Timeout na geração de vídeo.')
          }
          await sleep(POLL_INTERVAL_MS)
          operation = await ai.operations.getVideosOperation({ operation })
        }

        if (operation.error) {
          const detail = (operation.error as { message?: string }).message
          throw new VideoProviderError(
            'provider_failed',
            `Falha no provider: ${detail ?? String(operation.error)}`
          )
        }

        const video = operation.response?.generatedVideos?.[0]?.video
        if (!video) {
          throw new VideoProviderError(
            'provider_failed',
            'Falha no provider: resposta sem vídeo.'
          )
        }

        const bytes = await downloadVideoBytes(ai, video)
        if (!bytes) {
          throw new VideoProviderError(
            'provider_failed',
            'Falha no provider: não foi possível baixar o vídeo.'
          )
        }

        const jobId = operation.name?.split('/').pop() ?? `veo-${Date.now()}`
        const videoUrl = await saveVideoBuffer(jobId, bytes)
        return { videoUrl, provider: 'google', fromCache: false }
      } catch (error) {
        if (error instanceof VideoProviderError) throw error
        throw new VideoProviderError(
          'provider_failed',
          `Falha no provider: ${errorMessage(error)}`
        )
      }
    },
  }
}
