// app/api/video/route.ts — seleção (GET) e geração (POST) de vídeo.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { getProvider, listAvailableProviders } from '@/lib/video'
import { errorMessage, VideoProviderError } from '@/lib/video/types'
import type {
  VideoGenInput,
  VideoProvider,
  VideoProviderId,
} from '@/lib/video/types'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const DEFAULT_DURATION_SEG = 8

const PROVIDER_IDS: VideoProviderId[] = ['openai', 'google', 'mock']

export async function GET() {
  return NextResponse.json({
    available: listAvailableProviders(),
    default: getProvider().id,
  })
}

export async function POST(request: NextRequest) {
  let videoPrompt = ''
  let providerId: VideoProviderId | undefined

  try {
    const body = (await request.json()) as {
      videoPrompt?: unknown
      provider?: unknown
    }
    videoPrompt =
      typeof body.videoPrompt === 'string' ? body.videoPrompt.trim() : ''
    if (typeof body.provider === 'string') {
      if ((PROVIDER_IDS as string[]).includes(body.provider)) {
        providerId = body.provider as VideoProviderId
      } else {
        return NextResponse.json(
          { message: `Provider inválido: ${body.provider}.` },
          { status: 400 }
        )
      }
    }
  } catch {
    return NextResponse.json(
      { message: 'Corpo da requisição inválido: JSON esperado.' },
      { status: 400 }
    )
  }

  if (!videoPrompt) {
    return NextResponse.json(
      { message: 'O campo videoPrompt é obrigatório.' },
      { status: 400 }
    )
  }

  let provider: VideoProvider
  try {
    provider = getProvider(providerId)
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 500 })
  }

  const input: VideoGenInput = {
    prompt: videoPrompt,
    aspectRatio: '9:16',
    duracaoSeg: DEFAULT_DURATION_SEG,
  }

  try {
    const result = await provider.generate(input)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof VideoProviderError) {
      return NextResponse.json({ message: error.message }, { status: 500 })
    }
    return NextResponse.json(
      { message: `Falha no provider: ${errorMessage(error)}` },
      { status: 500 }
    )
  }
}
