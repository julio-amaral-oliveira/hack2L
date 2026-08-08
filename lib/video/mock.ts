// lib/video/mock.ts — provider de vídeo mock.
// Espera 3 segundos; se o MP4 de VIDEO_CACHE_PATH existir em public/,
// devolve o caminho com fromCache: true; senão devolve um MP4 de exemplo.

import fs from 'node:fs'
import path from 'node:path'

import { sleep } from './types'
import type { VideoGenInput, VideoGenResult, VideoProvider } from './types'

const DEFAULT_CACHE_PATH = '/videos/ifood-cache.mp4'

export const SAMPLE_VIDEO_URL =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'

const WAIT_MS = 3_000

function resolveCachePath(): string {
  const raw = process.env.VIDEO_CACHE_PATH ?? DEFAULT_CACHE_PATH
  return raw.replace(/^\/+/, '')
}

function cacheFileExists(): boolean {
  try {
    const absolute = path.join(process.cwd(), 'public', resolveCachePath())
    return fs.existsSync(absolute)
  } catch {
    return false
  }
}

export const mockProvider: VideoProvider = {
  id: 'mock',
  async generate(input: VideoGenInput): Promise<VideoGenResult> {
    void input
    await sleep(WAIT_MS)
    const fromCache = cacheFileExists()
    return {
      videoUrl: fromCache ? `/${resolveCachePath()}` : SAMPLE_VIDEO_URL,
      provider: 'mock',
      fromCache,
    }
  },
}
