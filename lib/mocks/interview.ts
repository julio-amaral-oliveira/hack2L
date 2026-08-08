// lib/mocks/interview.ts — entrevista mockada, determinística.
// Usada quando não há chave de LLM ou quando INTERVIEW_MOCK=1. O roteiro é o
// caso iFood, e o diagnóstico que ele monta NÃO foi inventado: veio da busca
// real da Gorilla em demo/ifood/evidence.
//
// O turno é escolhido pelo número de perguntas já feitas, então o mock
// atravessa a conversa inteira sem precisar de estado no servidor.

import type { Diagnosis, InterviewTurn } from '@/lib/contracts'

/** Atraso por token, para o streaming parecer vivo na UI. */
const TOKEN_DELAY_MS = 18

interface ScriptedTurn {
  message: string
  diagnosis: Partial<Diagnosis>
  complete: boolean
}

const SCRIPT: ScriptedTurn[] = [
  {
    message:
      'Vamos fechar o diagnóstico. Primeiro: quem é a pessoa que decide contratar ' +
      'vocês — e o que ela está tentando resolver quando procura a marca?',
    diagnosis: {},
    complete: false,
  },
  {
    message:
      'Entendi. Agora o desejo por trás disso: quando essa pessoa imagina o problema ' +
      'resolvido, o que muda no dia a dia dela concretamente?',
    diagnosis: {
      prospect:
        'Dono ou dona de restaurante e pequeno delivery que sente as taxas consumindo a margem',
    },
    complete: false,
  },
  {
    message:
      'Ela já tentou resolver isso de outro jeito antes de chegar em vocês? Se sim, ' +
      'com o quê — e por que não funcionou?',
    diagnosis: {
      desejoDominante:
        'Parar de perder margem para as taxas sem precisar virar a noite refazendo a conta',
    },
    complete: false,
  },
  {
    message:
      'Isso é importante. E o que essa pessoa acredita hoje que atrapalha a decisão? ' +
      'Estou atrás das objeções que aparecem na hora de fechar.',
    diagnosis: {
      nivelConsciencia: 'solution_aware',
      sofisticacaoMercado: 'alta',
    },
    complete: false,
  },
  {
    message:
      'Última: o que vocês fazem que ninguém mais faz — e que prova vocês têm em mãos ' +
      'para sustentar isso sem promessa vazia?',
    diagnosis: {
      crencas: [
        'As taxas comem a margem, e é preciso calcular para enxergar isso — youtube.com/watch?v=UpksCWlcSO4',
        'Dá para recuperar margem recalculando preço com planilha ou calculadora',
        'Toda promessa de taxa zero de concorrente é temporária — youtube.com/watch?v=dKpzrvAkhu4',
      ],
      objeicoes: [
        'Promessa de taxa zero pode ser insustentável e ter prazo de validade',
        'Gerenciar várias plataformas custa tempo e atenção — reddit.com/r/saopaulo',
        'Dono pequeno entra sem entender como a plataforma funciona',
      ],
    },
    complete: false,
  },
  {
    message:
      'Diagnóstico fechado. O prospect é solution aware num mercado de sofisticação alta ' +
      '— estágio 4 de 5 na escala de Schwartz. Nesse estágio promessa não funciona, só ' +
      'mecanismo. Pode aprovar e seguir para o criativo.',
    diagnosis: {
      mecanismo:
        'Fazer a conta pelo dono, em vez de ensinar o dono a fazer. Move a conversa do ' +
        'eixo taxa, onde a marca perde, para o eixo previsibilidade, onde ela ganha.',
      prova:
        'Escala real da marca: mais de 500 mil estabelecimentos parceiros em mais de ' +
        '1.500 cidades. Não há prova de resultado de campanha — nenhum número de ' +
        'performance deve ser afirmado.',
    },
    complete: true,
  },
]

/**
 * Escolhe o turno pela quantidade de perguntas já feitas. Passou do fim do
 * roteiro, ou forceComplete, devolve o turno de fechamento.
 */
export function mockInterviewTurn(
  questionsAsked: number,
  forceComplete: boolean
): InterviewTurn {
  const last = SCRIPT[SCRIPT.length - 1]
  if (forceComplete) return { ...last }
  const turn = SCRIPT[questionsAsked] ?? last
  return { ...turn }
}

/**
 * Emite a message em pedaços, para a UI mostrar o texto aparecendo.
 * Quebra por palavra: é o que melhor imita o streaming do LLM real.
 */
export async function* mockInterviewTokens(
  message: string
): AsyncGenerator<string> {
  const partes = message.split(/(\s+)/).filter(Boolean)
  for (const parte of partes) {
    await new Promise((resolve) => setTimeout(resolve, TOKEN_DELAY_MS))
    yield parte
  }
}

/** true quando o mock deve assumir mesmo havendo chave de LLM. */
export function isInterviewMockForced(): boolean {
  return process.env.INTERVIEW_MOCK === '1'
}
