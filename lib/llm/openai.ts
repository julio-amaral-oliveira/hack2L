// lib/llm/openai.ts — provider de LLM via OpenAI (GPT).
// Chat Completions com tool use (sem strict: true): tools function + tool_choice
// forçando a função. O streaming acumula delta.tool_calls[].function.arguments
// e emite os tokens do campo streamField ao vivo. Erros da API viram Error
// com mensagem clara em PT-BR. Padrão de factory espelhado de lib/video/openai.ts.

import OpenAI, { APIError as OpenAIAPIError } from 'openai'

import { createFieldExtractor, deferred } from './types'
import type { LLMProvider, StructuredRequest } from './types'

const DEFAULT_MODEL = 'gpt-4o'

export function createOpenAIProvider(apiKey: string): LLMProvider {
  const client = new OpenAI({ apiKey })

  function modelId(): string {
    // trim + || para tolerar OPENAI_MODEL definido como string vazia.
    return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL
  }

  function toError(erro: unknown): Error {
    if (erro instanceof OpenAIAPIError) {
      const status = erro.status ? ` (HTTP ${erro.status})` : ''
      return new Error(`Falha na chamada ao modelo.${status} ${erro.message}`)
    }
    return erro instanceof Error
      ? erro
      : new Error('Erro interno na chamada ao modelo.')
  }

  function toolRequest(req: StructuredRequest) {
    return {
      tools: [
        {
          type: 'function' as const,
          function: {
            name: req.toolName,
            description: req.toolDescription,
            parameters: req.jsonSchema,
          },
        },
      ],
      tool_choice: {
        type: 'function' as const,
        function: { name: req.toolName },
      },
    }
  }

  function buildMessages(req: StructuredRequest) {
    return [
      { role: 'system' as const, content: req.system },
      ...req.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ]
  }

  return {
    id: 'openai',
    async generateStructured(req: StructuredRequest): Promise<unknown> {
      try {
        const response = await client.chat.completions.create({
          model: modelId(),
          max_tokens: req.maxTokens ?? 1024,
          messages: buildMessages(req),
          ...toolRequest(req),
        })

        const toolCall = response.choices[0]?.message?.tool_calls?.find(
          (call): call is OpenAI.Chat.ChatCompletionMessageFunctionToolCall =>
            call.type === 'function' && call.function.name === req.toolName
        )
        if (!toolCall) {
          throw new Error(
            'A IA não devolveu uma resposta estruturada válida. Tente novamente.'
          )
        }

        try {
          return JSON.parse(toolCall.function.arguments) as unknown
        } catch {
          throw new Error('A IA devolveu um JSON inválido. Tente novamente.')
        }
      } catch (erro) {
        throw toError(erro)
      }
    },
    streamStructured(req: StructuredRequest & { streamField: string }) {
      const { result, resolve, reject } = deferred<unknown>()
      const extract = createFieldExtractor(req.streamField)
      let argumentsBuf = ''

      async function* events(): AsyncGenerator<{ type: 'token'; value: string }> {
        try {
          const stream = await client.chat.completions.create({
            model: modelId(),
            max_tokens: req.maxTokens ?? 2048,
            stream: true,
            messages: buildMessages(req),
            ...toolRequest(req),
          })

          for await (const chunk of stream) {
            const toolCallDeltas = chunk.choices[0]?.delta?.tool_calls ?? []
            for (const toolCall of toolCallDeltas) {
              // O campo `type` só vem no PRIMEIRO delta do tool call; os
              // deltas seguintes (com `arguments`) vêm sem type. Só exclui
              // tool calls custom.
              if (toolCall.type && toolCall.type !== 'function') continue
              if (toolCall.function?.name && toolCall.function.name !== req.toolName) {
                continue
              }
              const delta = toolCall.function?.arguments
              if (typeof delta !== 'string' || delta.length === 0) continue
              argumentsBuf += delta
              const fresh = extract(argumentsBuf)
              if (fresh) yield { type: 'token', value: fresh }
            }
          }

          try {
            resolve(JSON.parse(argumentsBuf) as unknown)
          } catch {
            reject(new Error('A IA devolveu um JSON inválido. Tente novamente.'))
          }
        } catch (erro) {
          // Erro de API/stream: rejeita o resultado e encerra os eventos.
          // Quem consome faz `await result` e recebe a mensagem clara.
          reject(toError(erro))
        }
      }

      return { events: events(), result }
    },
  }
}
