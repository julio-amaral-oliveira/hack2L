// app/api/market/route.ts — caixa "Pesquisa de mercado", em duas fases.
//
// POST { dores: string[] }        → { searchId, fromFixture }
// GET  ?id=<searchId>             → MarketSignal
//
// Duas fases de propósito: a busca real leva 75s a 85s e estouraria o
// maxDuration de 60s da Vercel. O cliente abre com POST e faz polling no GET
// a cada ~1,5s. O GET é gratuito — não gasta crédito.
//
// Erros voltam como { message } em PT-BR, igual às outras rotas.

import { NextResponse } from 'next/server'

import {
  MarketError,
  readMarketResearch,
  startMarketResearch,
} from '@/lib/boxes/market'

export const runtime = 'nodejs'
export const maxDuration = 60

function fail(error: unknown): Response {
  if (error instanceof MarketError) {
    return NextResponse.json({ message: error.message }, { status: error.status })
  }
  console.error('Falha na pesquisa de mercado:', error)
  return NextResponse.json(
    { message: 'Erro interno na pesquisa de mercado. Tente novamente.' },
    { status: 500 }
  )
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json().catch(() => null)) as {
      dores?: unknown
      since?: unknown
      limit?: unknown
    } | null

    const dores = Array.isArray(body?.dores)
      ? body!.dores.filter((d): d is string => typeof d === 'string')
      : []

    if (dores.length === 0) {
      return NextResponse.json(
        {
          message:
            'Envie { "dores": ["..."] } — a dor em primeira pessoa, do jeito que o ' +
            'prospect falaria. Buscar o nome da marca traz notícia, não gente.',
        },
        { status: 400 }
      )
    }

    const started = await startMarketResearch({
      dores,
      since: typeof body?.since === 'string' ? body.since : undefined,
      limit: typeof body?.limit === 'number' ? body.limit : undefined,
    })
    return NextResponse.json(started)
  } catch (error) {
    return fail(error)
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { message: 'Informe o id da busca: /api/market?id=<searchId>.' },
        { status: 400 }
      )
    }
    const startedAt = Number(new URL(request.url).searchParams.get('startedAt')) || undefined
    return NextResponse.json(await readMarketResearch(id, startedAt))
  } catch (error) {
    return fail(error)
  }
}
