// app/api/ingest/route.ts — POST multipart (campo "files") → BrandDigest.
// Extrai o texto dos arquivos e condensa com a caixa de ingestão
// (lib/boxes/ingest.ts). Erros voltam como { message } em PT-BR.

import { NextResponse } from 'next/server'

import {
  IngestError,
  ingestFiles,
  type IngestFile,
} from '@/lib/boxes/ingest'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData().catch(() => null)
    if (!formData) {
      return NextResponse.json(
        {
          message:
            'Envie os arquivos como multipart/form-data no campo "files" (ex.: curl -F "files=@exemplo.md" /api/ingest).',
        },
        { status: 400 }
      )
    }

    const entries = formData.getAll('files')
    const arquivos: IngestFile[] = []

    for (const entry of entries) {
      if (!(entry instanceof File)) continue
      const texto = await entry.text().catch(() => '')
      arquivos.push({ nome: entry.name, texto })
    }

    if (arquivos.length === 0) {
      return NextResponse.json(
        {
          message:
            'Nenhum arquivo válido encontrado. Envie arquivos .txt, .md ou .markdown no campo "files".',
        },
        { status: 400 }
      )
    }

    const digest = await ingestFiles(arquivos)
    return NextResponse.json(digest)
  } catch (error) {
    if (error instanceof IngestError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    console.error('Falha na ingestão:', error)
    return NextResponse.json(
      { message: 'Erro interno na ingestão. Tente novamente.' },
      { status: 500 }
    )
  }
}
