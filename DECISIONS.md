# Decisões — agencia-ai (BrandLoop)

> Registro definitivo das decisões da sessão de grilling (2026-08-08).
> Estado vivo e evolução ficam em `checkpoints/agencia-ai/`.

## Contexto

- Projeto de hackathon com ambição de virar produto/startup.
- Prazo de construção: 3 horas.
- O time constrói o pipeline; a caixa de criativo foi revertida para
  escopo do time.

## Pipeline

Quatro caixas, orquestradas por um agente. Cada caixa é preta: nenhuma
caixa conhece a outra. O orquestrador gerencia fila e estado.

1. **Aprender** — o usuário injeta arquivos da empresa (mockáveis). O
   sistema ingere os arquivos e roda um chat adaptativo (estilo grill-me)
   até fechar o diagnóstico. O diagnóstico usa os termos da rubrica:
   prospect, desejo dominante, nível de consciência, sofisticação de
   mercado, crenças, objeções, mecanismo, prova.
2. **Criativo** — gera a copy usando a rubrica de copywriting
   (`RUBRICA DE COPYWRITING — BREAKTHROUGH ADVERTISING.md`) e gera o
   vídeo vertical via API. Providers de vídeo plugáveis: NanoBanana e
   Sora (não fechado). Sem fallback TTS/slides.
3. **Publicar** — publica no YouTube Shorts. Mock; não aparece na demo.
4. **Campanha** — cria campanha no Google Ads apontando para a landing
   page existente (brandloop-lp.vercel.app). Mock; não aparece na demo
   (burocracia do Google Ads).

## Demo

- Marca grande e reconhecível, com dados mockados.
- Fluxo: upload dos arquivos, entrevista adaptativa, diagnóstico,
  copy, vídeo, mocks de publicação e campanha.

## Stack

- Next.js 15 (App Router) + TypeScript.
- Tailwind + shadcn/ui.
- Deploy na Vercel.
- LLM: Anthropic (Claude) para entrevista e copy; GPT como backup.
- Adapter `VideoProvider` com seletor de provider.
- Entrevista em streaming (SSE).

## Fora de escopo

- Integração real com Google Ads e YouTube Shorts.
- Landing page (já existe).
- Tracking e loop de feedback de performance.
- Interno da caixa criativo (copy e vídeo) — agora escopo do time; mas
  a produção humana de vídeo não existe mais.
