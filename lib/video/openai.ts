// lib/video/openai.ts — provider de vídeo via OpenAI (Sora).
// API real (openai 7.4.0): client.videos.create({ prompt, model, seconds, size })
// -> job; client.videos.retrieve(id) para poll; client.videos.downloadContent(id)
// para baixar o MP4.

import OpenAI from 'openai'

import {
  errorMessage,
  saveVideoBuffer,
  sleep,
  VideoProviderError,
} from './types'
import type { VideoGenInput, VideoGenResult, VideoProvider } from './types'

const DEFAULT_MODEL = 'sora-2'
const POLL_INTERVAL_MS = 5_000
const POLL_TIMEOUT_MS = 240_000

type SoraSeconds = '4' | '8' | '12'

function secondsParam(duracaoSeg: number): SoraSeconds {
  if (duracaoSeg <= 4) return '4'
  if (duracaoSeg <= 8) return '8'
  return '12'
}

export function createOpenAIProvider(apiKey: string): VideoProvider {
  const client = new OpenAI({ apiKey })

  async function waitForJob(jobId: string): Promise<void> {
    const deadline = Date.now() + POLL_TIMEOUT_MS
    for (;;) {
      const video = await client.videos.retrieve(jobId)
      if (video.status === 'completed') return
      if (video.status === 'failed') {
        throw new VideoProviderError(
          'provider_failed',
          `Falha no provider: ${video.error?.message ?? 'o job de vídeo falhou'}`
        )
      }
      if (Date.now() >= deadline) {
        throw new VideoProviderError('timeout', 'Timeout na geração de vídeo.')
      }
      await sleep(POLL_INTERVAL_MS)
    }
  }

  return {
    id: 'openai',
    async generate(input: VideoGenInput): Promise<VideoGenResult> {
      const model = process.env.OPENAI_VIDEO_MODEL ?? DEFAULT_MODEL
      let jobId: string
      try {
        const created = await client.videos.create({
          prompt: input.prompt,
          model,
          seconds: secondsParam(input.duracaoSeg),
          size: '720x1280', // vertical 9:16
        })
        jobId = created.id
      } catch (error) {
        throw new VideoProviderError(
          'provider_failed',
          `Falha no provider: ${errorMessage(error)}`
        )
      }

      try {
        await waitForJob(jobId)
        const response = await client.videos.downloadContent(jobId)
        const buffer = Buffer.from(await response.arrayBuffer())
        const videoUrl = await saveVideoBuffer(jobId, buffer)
        return { videoUrl, provider: 'openai', fromCache: false }
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
