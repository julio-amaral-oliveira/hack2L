// lib/llm/anthropic.ts — provider de LLM via Anthropic (Claude).
// Mesmo contrato do adapter em lib/llm/types.ts. Comportamento idêntico ao
// que as caixas faziam antes: tool use com tool_choice forçado e streaming
// via messages.stream (input_json_delta). Padrão de factory espelhado de
// lib/video/openai.ts.

import Anthropic from '@anthropic-ai/sdk'

import { createFieldExtractor, deferred } from './types'
import type { LLMProvider, StructuredRequest } from './types'

const DEFAULT_MODEL = 'claude-sonnet-4-5'

export function createAnthropicProvider(apiKey: string): LLMProvider {
  const client = new Anthropic({ apiKey })

  function modelId(): string {
    // trim + || para tolerar ANTHROPIC_MODEL definido como string vazia.
    return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL
  }

  function toError(erro: unknown): Error {
    if (erro instanceof Anthropic.APIError) {
      const status = erro.status ? ` (HTTP ${erro.status})` : ''
      return new Error(`Falha na chamada ao modelo.${status} ${erro.message}`)
    }
    return erro instanceof Error
      ? erro
      : new Error('Erro interno na chamada ao modelo.')
  }

  function toolRequest(req: StructuredRequest): {
    tools: Anthropic.Tool[]
    tool_choice: { type: 'tool'; name: string }
  } {
    return {
      tools: [
        {
          name: req.toolName,
          description: req.toolDescription,
          input_schema: req.jsonSchema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: 'tool', name: req.toolName },
    }
  }

  return {
    id: 'anthropic',
    async generateStructured(req: StructuredRequest): Promise<unknown> {
      try {
        const response = await client.messages.create({
          model: modelId(),
          max_tokens: req.maxTokens ?? 1024,
          system: req.system,
          messages: req.messages as Anthropic.MessageParam[],
          ...toolRequest(req),
        })

        const toolUse = response.content.find(
          (block): block is Anthropic.ToolUseBlock =>
            block.type === 'tool_use' && block.name === req.toolName
        )
        if (!toolUse) {
          throw new Error(
            'A IA não devolveu uma resposta estruturada válida. Tente novamente.'
          )
        }
        return toolUse.input
      } catch (erro) {
        throw toError(erro)
      }
    },
    streamStructured(req: StructuredRequest & { streamField: string }) {
      const { result, resolve, reject } = deferred<unknown>()
      const extract = createFieldExtractor(req.streamField)
      let jsonBuf = ''

      async function* events(): AsyncGenerator<{ type: 'token'; value: string }> {
        try {
          const streamMessage = client.messages.stream({
            model: modelId(),
            max_tokens: req.maxTokens ?? 2048,
            system: req.system,
            messages: req.messages as Anthropic.MessageParam[],
            ...toolRequest(req),
          })

          for await (const event of streamMessage) {
            if (event.type !== 'content_block_delta') continue
            if (event.delta.type !== 'input_json_delta') continue
            jsonBuf += event.delta.partial_json
            const fresh = extract(jsonBuf)
            if (fresh) yield { type: 'token', value: fresh }
          }

          const finalMessage = await streamMessage.finalMessage()
          const toolUse = finalMessage.content.find(
            (block): block is Anthropic.ToolUseBlock =>
              block.type === 'tool_use' && block.name === req.toolName
          )
          if (!toolUse) {
            reject(
              new Error(
                'A IA não devolveu uma resposta estruturada válida. Tente novamente.'
              )
            )
            return
          }
          resolve(toolUse.input)
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
