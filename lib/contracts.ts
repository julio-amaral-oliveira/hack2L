// lib/contracts.ts — fonte única da verdade.

export type StepId = 'aprender' | 'criativo' | 'publicar' | 'campanha'

export type StepStatus =
  | 'pendente'
  | 'em_andamento'
  | 'aguardando_aprovacao'
  | 'concluido'
  | 'erro'

export interface BrandDigest {
  resumo: string
  fatos: string[]
  arquivos: { nome: string; chars: number }[]
}

export type AwarenessLevel =
  | 'unaware'
  | 'problem_aware'
  | 'solution_aware'
  | 'product_aware'
  | 'most_aware'

export interface Diagnosis {
  prospect: string
  desejoDominante: string
  nivelConsciencia: AwarenessLevel
  sofisticacaoMercado: 'baixa' | 'media' | 'alta'
  crencas: string[]
  objeicoes: string[]
  mecanismo: string
  prova: string
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export interface InterviewTurn {
  message: string
  diagnosis: Partial<Diagnosis>
  complete: boolean
}

export type InterviewEvent =
  | { type: 'token'; value: string }
  | { type: 'turn'; value: InterviewTurn }
  | { type: 'error'; message: string }

export interface Scene {
  ordem: number
  fala: string
  textoNaTela: string
  duracaoSeg: number
}

export interface CopyPackage {
  headline: string
  roteiro: Scene[]
  titulo: string
  descricao: string
  hashtags: string[]
  cta: string
  videoPrompt: string
}

export type VideoProviderId = 'openai' | 'google' | 'mock'

export interface VideoGenInput {
  prompt: string
  aspectRatio: '9:16'
  duracaoSeg: number
}

export interface VideoGenResult {
  videoUrl: string
  provider: VideoProviderId
  fromCache: boolean
}

export interface VideoProvider {
  id: VideoProviderId
  generate(input: VideoGenInput): Promise<VideoGenResult>
}

export interface PublishResult {
  plataforma: 'youtube-shorts'
  status: 'publicado'
  url: string
  simulado: true
}

export interface CampaignResult {
  plataforma: 'google-ads'
  status: 'ativa'
  landingPage: string
  orcamentoDiario: number
  segmentacao: string[]
  simulado: true
}

export interface PipelineState {
  status: Record<StepId, StepStatus>
  digest: BrandDigest | null
  partialDiagnosis: Partial<Diagnosis>
  diagnosis: Diagnosis | null
  copy: CopyPackage | null
  video: VideoGenResult | null
  publish: PublishResult | null
  campaign: CampaignResult | null
}
