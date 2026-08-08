// lib/mocks/copy.ts — copy mockada, determinística.
// Usada quando não há chave de LLM, quando MOCK_LLM=1 ou quando a chamada real
// falha por falta de crédito (erro de quota — ver isQuotaError em lib/llm).
// O pacote é derivado do Diagnosis fechado na entrevista: headline por template
// conforme o nível de consciência, roteiro de 3 cenas (gancho → mecanismo →
// CTA), título, descrição, hashtags tiradas do prospect e o CTA da landing
// page oficial. Nada aqui depende de estado no servidor.

import type { CopyPackage, Diagnosis, Scene } from '@/lib/contracts'

/** Destino do CTA. Mesmo default da caixa Criativo (lib/boxes/copyPrompt.ts). */
const LANDING_PAGE_URL =
  process.env.LANDING_PAGE_URL?.trim() || 'https://brandloop-lp.vercel.app'

/** true quando o mock deve assumir mesmo havendo chave de LLM. */
export function isMockLLMForced(): boolean {
  return process.env.MOCK_LLM === '1'
}

/** Primeira letra minúscula, para encaixar o desejo no meio de uma frase. */
function lowerCaseFirst(texto: string): string {
  if (texto.length === 0) return texto
  return texto.charAt(0).toLowerCase() + texto.slice(1)
}

/** Headline por template, alinhada ao nível de consciência da rubrica. */
function headlinePara(diagnosis: Diagnosis): string {
  const desejo = lowerCaseFirst(diagnosis.desejoDominante)
  switch (diagnosis.nivelConsciencia) {
    case 'unaware':
      return `O problema que você não sabe que tem: ${desejo}.`
    case 'problem_aware':
      return `Você já tentou resolver sozinho. Agora existe um jeito de ${desejo} sem virar a noite refazendo a conta.`
    case 'solution_aware':
      return `Soluções existem. A rara que resolve de verdade: ${desejo}, sem promessa vazia.`
    case 'product_aware':
      return `Por que ${desejo} ainda não virou rotina para você?`
    case 'most_aware':
      return `Pronto para ${desejo}? Comece hoje.`
  }
}

/** Fala da cena 1 (gancho): a dor do prospect em uma frase. */
function falaGancho(diagnosis: Diagnosis): string {
  return (
    `Se você é ${lowerCaseFirst(diagnosis.prospect)}, ` +
    `${lowerCaseFirst(diagnosis.desejoDominante)} não é novidade — e o ` +
    'pior: sem tempo para sentar e resolver isso direito.'
  )
}

/** Fala da cena 2 (mecanismo): como o mecanismo resolve, sem inventar provas. */
function falaMecanismo(diagnosis: Diagnosis): string {
  return (
    `A diferença está no mecanismo: ${lowerCaseFirst(diagnosis.mecanismo)}. ` +
    'Assim o resultado deixa de depender de você acertar cada detalhe.'
  )
}

/** Fala da cena 3 (CTA): chama o prospect para a ação, com o link do CTA. */
function falaCta(diagnosis: Diagnosis): string {
  return (
    `Quer começar ainda esta semana? Clique no link e dê o primeiro passo ` +
    `para ${lowerCaseFirst(diagnosis.desejoDominante)}.`
  )
}

const GANCHO_TELA = 'SUA MARGEM SUMINDO'
const MECANISMO_TELA = 'FAZEMOS A CONTA'
const CTA_TELA = 'CLIQUE NO LINK'

/** Roteiro de 3 cenas: gancho → mecanismo → CTA. Total de 20 segundos. */
function roteiroPara(diagnosis: Diagnosis): Scene[] {
  return [
    {
      ordem: 1,
      fala: falaGancho(diagnosis),
      textoNaTela: GANCHO_TELA,
      duracaoSeg: 6,
    },
    {
      ordem: 2,
      fala: falaMecanismo(diagnosis),
      textoNaTela: MECANISMO_TELA,
      duracaoSeg: 8,
    },
    {
      ordem: 3,
      fala: falaCta(diagnosis),
      textoNaTela: CTA_TELA,
      duracaoSeg: 6,
    },
  ]
}

const FALLBACK_TAGS = ['VenderMais', 'Margem', 'Delivery', 'PequenoNegocio', 'MaisVendas']

/**
 * Hashtags derivadas do prospect: normaliza (sem acentos, minúsculas), remove
 * stopwords e deduplica; se sobrar menos de 3, completa com tags fixas.
 */
function hashtagsPara(prospect: string): string[] {
  const stopwords = new Set([
    'a', 'as', 'o', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos',
    'das', 'em', 'no', 'na', 'nos', 'nas', 'com', 'para', 'por', 'que', 'e',
    'ou', 'se', 'nao', 'ja', 'sua', 'seu', 'suas', 'seus', 'sem', 'mas', 'ao',
    'aos', 'pelo', 'pela', 'entre', 'quando', 'quem', 'ainda', 'mesmo', 'sendo',
    'ele', 'ela', 'sente', 'sao', 'mais', 'menos', 'so', 'tambem',
  ])

  const palavras = prospect
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((palavra) => palavra.length >= 4 && !stopwords.has(palavra))

  const tags = [...new Set(palavras)].slice(0, 5).map(
    (palavra) => `#${palavra.charAt(0).toUpperCase()}${palavra.slice(1)}`
  )

  let i = 0
  while (tags.length < 3) {
    const tag = `#${FALLBACK_TAGS[i]!}`
    i++
    if (!tags.includes(tag)) tags.push(tag)
  }
  return tags.slice(0, 5)
}

/** Título do Shorts, com teto de 100 chars; sem truncar no meio da frase. */
function tituloPara(diagnosis: Diagnosis): string {
  const desejo = lowerCaseFirst(diagnosis.desejoDominante)
  const completo = `Como ${desejo} — sem remendo, sem promessa vazia`
  if (completo.length <= 100) return completo
  return `Como ${desejo}`.slice(0, 100).trim()
}

/** Descrição do vídeo: promessa, mecanismo e chamada para o CTA. */
function descricaoPara(diagnosis: Diagnosis): string {
  return (
    `Você quer ${lowerCaseFirst(diagnosis.desejoDominante)}. Neste vídeo, ` +
    `mostramos o mecanismo por trás: ` +
    `${lowerCaseFirst(diagnosis.mecanismo)}. Sem promessa vazia e sem virar ` +
    `a noite refazendo a conta. Clique no link da descrição para começar: ` +
    LANDING_PAGE_URL
  )
}

/** Prompt do vídeo em inglês: descreve a CENA 1, vertical 9:16, texto PT-BR. */
function videoPromptPara(cena1: Scene): string {
  return (
    `Vertical 9:16 video. Scene 1 (hook): close-up of a small business owner ` +
    `looking at a phone screen with falling numbers, frustrated, in a busy ` +
    `kitchen. On-screen text in Brazilian Portuguese, max 3 words per ` +
    `screen: "${cena1.textoNaTela}". Mood: urgent and relatable, speaking ` +
    'directly to the target audience.'
  )
}

/**
 * Monta o CopyPackage completo a partir do Diagnosis. Determinístico: a mesma
 * entrada sempre devolve o mesmo pacote, sem estado no servidor.
 */
export function mockCopyPackage(diagnosis: Diagnosis): CopyPackage {
  const roteiro = roteiroPara(diagnosis)
  const cena1 = roteiro[0] as Scene
  return {
    headline: headlinePara(diagnosis),
    roteiro,
    titulo: tituloPara(diagnosis),
    descricao: descricaoPara(diagnosis),
    hashtags: hashtagsPara(diagnosis.prospect),
    cta: LANDING_PAGE_URL,
    videoPrompt: videoPromptPara(cena1),
  }
}
