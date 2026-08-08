// lib/mocks/research.ts — análise de mercado mockada.
// Rede de segurança da caixa que mais pode falhar no palco: a Gorilla é uma
// API externa, com créditos finitos, rate limit e timeout de 240s. Sem chave,
// sem crédito, ou com a rede do evento ruim, a demo morria no meio.
//
// O dado NÃO é inventado: sai de demo/ifood/evidence/gorilla-mercado-raw.json,
// que é uma execução real de 08/08/2026 com search_id verificável
// (4554b5ce-a28d-4d49-abfe-af3fec65ab84, 719 resultados, 66 créditos).
//
// O campo `data` do fixture já vem no mesmo formato do custom_schema, então
// mapMarketDataToAnalysis consome direto — sem tradução no meio.

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { mapMarketDataToAnalysis } from '@/lib/boxes/gorilla'
import type { MarketAnalysis } from '@/lib/contracts'

const FIXTURE = join(
  process.cwd(),
  'demo',
  'ifood',
  'evidence',
  'gorilla-mercado-raw.json'
)

/** Faz o mock assumir mesmo com chave válida. Útil no palco. */
export function isResearchMockForced(): boolean {
  return process.env.MOCK_RESEARCH === '1'
}

/**
 * Último recurso, caso o fixture não esteja no deploy. Mantém a demo de pé
 * com o mesmo diagnóstico, só sem o corpus de evidência por trás.
 */
function fallbackEmbutido(assunto: string): MarketAnalysis {
  return {
    assunto,
    resumo:
      'Dono de restaurante e pequeno delivery preocupado que as taxas estão ' +
      'consumindo a margem. A conversa dominante não é trocar de plataforma: ' +
      'é aprender a fazer a conta sem ter prejuízo.',
    prospect:
      'Dono ou dona de restaurante e pequeno delivery que sente as taxas consumindo a margem',
    desejoDominante:
      'Reduzir o impacto das comissões na margem sem virar a noite refazendo a conta',
    estadoDeConsciencia: 'solution_aware',
    sofisticacaoMercado: 'alta',
    crencas: [
      {
        texto: 'As taxas comem a margem, e é preciso calcular para enxergar isso',
        evidenciaUrl: 'https://www.youtube.com/watch?v=UpksCWlcSO4',
      },
      {
        texto: 'Toda promessa de taxa zero de concorrente é temporária',
        evidenciaUrl: 'https://www.youtube.com/watch?v=dKpzrvAkhu4',
      },
    ],
    objeicoes: [
      {
        texto: 'Gerenciar várias plataformas custa tempo e atenção',
        evidenciaUrl:
          'https://www.reddit.com/r/saopaulo/comments/1vh7qe3/voc%C3%AAs_ainda_pedem_ifood/',
      },
    ],
    concorrentes: [],
    linguagem: [
      'Gasto mais neurônios usando esses apps do que no trabalho',
      'taxa do iFood come minha margem',
      'iFood é parceiro… ou prisão?',
    ],
    mecanismoSugerido:
      'Fazer a conta pelo dono, em vez de ensinar o dono a fazer. Move a conversa ' +
      'do eixo taxa, onde a marca perde, para o eixo previsibilidade, onde ela ganha.',
    prova: [],
    creditosGastos: 0,
  }
}

/**
 * Lê o fixture e devolve a análise pronta. `assunto` vem do passo anterior
 * (buildResearchQuery) para a análise continuar coerente com a entrevista.
 */
export async function mockResearch(assunto: string): Promise<MarketAnalysis> {
  try {
    const raw = JSON.parse(await readFile(FIXTURE, 'utf-8')) as {
      data?: Record<string, unknown>
      credits_charged?: number
    }
    if (!raw.data || typeof raw.data !== 'object') {
      return fallbackEmbutido(assunto)
    }
    return mapMarketDataToAnalysis(
      { ...raw.data, assunto },
      raw.credits_charged ?? 0
    )
  } catch {
    return fallbackEmbutido(assunto)
  }
}
