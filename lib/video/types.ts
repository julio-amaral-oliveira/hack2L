// lib/video/types.ts — tipos e utilitários compartilhados do adapter de vídeo.

import fs from 'node:fs/promises'
import path from 'node:path'

export type {
  VideoProvider,
  VideoProviderId,
  VideoGenInput,
  VideoGenResult,
} from '@/lib/contracts'

export type VideoErrorCode = 'missing_key' | 'timeout' | 'provider_failed'

export class VideoProviderError extends Error {
  readonly code: VideoErrorCode

  constructor(code: VideoErrorCode, message: string) {
    super(message)
    this.name = 'VideoProviderError'
    this.code = code
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return String(error)
}

/** Salva os bytes do vídeo em public/videos/<jobId>.mp4 e devolve a URL pública. */
export async function saveVideoBuffer(
  jobId: string,
  data: Uint8Array
): Promise<string> {
  const safeId = jobId.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80)
  const dir = path.join(process.cwd(), 'public', 'videos')
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, `${safeId}.mp4`)
  await fs.writeFile(filePath, data)
  return `/videos/${safeId}.mp4`
}
