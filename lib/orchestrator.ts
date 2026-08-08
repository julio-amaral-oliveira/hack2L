// lib/orchestrator.ts — hook orquestrador do pipeline no cliente.
// Estado via useReducer sobre PipelineState. Funções finas de fetch por caixa.
// A entrevista (SSE) fica no ChatPanel (T4) — callInterview não mora aqui.

'use client'

import { useCallback, useReducer } from 'react'

import type {
  BrandDigest,
  CampaignResult,
  CopyPackage,
  Diagnosis,
  PipelineState,
  PublishResult,
  StepId,
  StepStatus,
  VideoGenResult,
  VideoProviderId,
} from '@/lib/contracts'

export type PipelineAction =
  | { type: 'SET_STATUS'; step: StepId; status: StepStatus }
  | { type: 'SET_DIGEST'; digest: BrandDigest }
  | { type: 'MERGE_PARTIAL_DIAGNOSIS'; partial: Partial<Diagnosis> }
  | { type: 'SET_DIAGNOSIS'; diagnosis: Diagnosis }
  | { type: 'SET_COPY'; copy: CopyPackage }
  | { type: 'SET_VIDEO'; video: VideoGenResult }
  | { type: 'SET_PUBLISH'; publish: PublishResult }
  | { type: 'SET_CAMPAIGN'; campaign: CampaignResult }
  | { type: 'RESET' }

export const initialPipelineState: PipelineState = {
  status: {
    aprender: 'pendente',
    criativo: 'pendente',
    publicar: 'pendente',
    campanha: 'pendente',
  },
  digest: null,
  partialDiagnosis: {},
  diagnosis: null,
  copy: null,
  video: null,
  publish: null,
  campaign: null,
}

export function pipelineReducer(
  state: PipelineState,
  action: PipelineAction
): PipelineState {
  switch (action.type) {
    case 'SET_STATUS':
      return {
        ...state,
        status: { ...state.status, [action.step]: action.status },
      }
    case 'SET_DIGEST':
      return { ...state, digest: action.digest }
    case 'MERGE_PARTIAL_DIAGNOSIS':
      return {
        ...state,
        partialDiagnosis: { ...state.partialDiagnosis, ...action.partial },
      }
    case 'SET_DIAGNOSIS':
      return { ...state, diagnosis: action.diagnosis }
    case 'SET_COPY':
      return { ...state, copy: action.copy }
    case 'SET_VIDEO':
      return { ...state, video: action.video }
    case 'SET_PUBLISH':
      return { ...state, publish: action.publish }
    case 'SET_CAMPAIGN':
      return { ...state, campaign: action.campaign }
    case 'RESET':
      return initialPipelineState
    default:
      return state
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => null)) as
    | (T & { message?: string })
    | null
  if (!res.ok || data === null) {
    throw new Error(data?.message ?? `Falha na requisição para ${url}`)
  }
  return data
}

export function usePipeline() {
  const [state, dispatch] = useReducer(pipelineReducer, initialPipelineState)

  const setStatus = useCallback((step: StepId, status: StepStatus) => {
    dispatch({ type: 'SET_STATUS', step, status })
  }, [])

  const callIngest = useCallback(async (files: File[]): Promise<BrandDigest> => {
    const form = new FormData()
    files.forEach((file) => form.append('files', file))
    const res = await fetch('/api/ingest', { method: 'POST', body: form })
    const data = (await res.json().catch(() => null)) as
      | (BrandDigest & { message?: string })
      | null
    if (!res.ok || data === null) {
      throw new Error(data?.message ?? 'Falha na ingestão da marca')
    }
    dispatch({ type: 'SET_DIGEST', digest: data })
    return data
  }, [])

  const callCopy = useCallback(
    async (
      input: { digest: BrandDigest; diagnosis: Diagnosis }
    ): Promise<CopyPackage> => {
      const copy = await postJson<CopyPackage>('/api/copy', input)
      dispatch({ type: 'SET_COPY', copy })
      return copy
    },
    []
  )

  const callVideo = useCallback(
    async (input: {
      videoPrompt: string
      provider?: VideoProviderId
    }): Promise<VideoGenResult> => {
      const video = await postJson<VideoGenResult>('/api/video', input)
      dispatch({ type: 'SET_VIDEO', video })
      return video
    },
    []
  )

  const callPublish = useCallback(async (): Promise<PublishResult> => {
    const publish = await postJson<PublishResult>('/api/publish', {})
    dispatch({ type: 'SET_PUBLISH', publish })
    return publish
  }, [])

  const callCampaign = useCallback(
    async (diagnosis: Diagnosis): Promise<CampaignResult> => {
      const campaign = await postJson<CampaignResult>('/api/campaign', {
        diagnosis,
      })
      dispatch({ type: 'SET_CAMPAIGN', campaign })
      return campaign
    },
    []
  )

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  return {
    state,
    dispatch,
    setStatus,
    callIngest,
    callCopy,
    callVideo,
    callPublish,
    callCampaign,
    reset,
  }
}
