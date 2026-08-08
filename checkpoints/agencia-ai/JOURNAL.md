# Diário cronológico — agencia-ai

> Registro append-only da evolução. A verdade vigente está em
> [STATE.md](STATE.md).

## 2026-08-08 — início

### Contexto

Usuário quer pensar numa ideia de pipeline de marketing automatizado com
agentes de IA: aprender sobre a marca, gerar roteiros/criativos, publicar
nas plataformas e gerir tráfego. Cada etapa é uma caixa preta. Um agente
orquestrador coordena. Primeira etapa pensada: usar uma sessão grill-me
para o sistema aprender sobre a marca (entrevista estruturada com o dono
da marca).

### Evidências e hipóteses

- Hipótese do usuário: grill-me pode ser a primeira caixa (aprender sobre
  a marca), por ser uma entrevista guiada.
- Hipótese: o fluxo completo fecha um ciclo, com dados de tráfego
  retroalimentando o aprendizado.
- Decisão do usuário: não é operação pessoal nem SaaS maduro — é
  aprendizado/hackathon com ambição de virar produto/startup.
- Decisão do usuário: a caixa de criativo é manual, feita por outro membro
  do time; as caixas de aprender, publicar e criar campanha são dos outros
  membros. Criar campanha é a parte principal do demo. Tracking é
  nice-to-have e pode ser cortado.
- Reversão: o criativo volta a ser escopo do time (copy via rubrica +
  vídeo via API). Publicar e criar campanha viram mock; a demo não mostra
  a publicação real (burocracia do Google Ads).
- Caixa 1 final: upload de arquivos da empresa (mockável) → ingestão →
  chat adaptativo até fechar o diagnóstico (prospect, desejo dominante,
  consciência, sofisticação, crenças, objeções, mecanismo, prova).
- Plataformas finais: Google Ads (campanha → landing page já existente
  brandloop-lp.vercel.app) e YouTube Shorts (publicação), ambos mock na
  demo.
- Prazo: 3 horas — escopo de construção mínimo com UI bonita (web app).
- Plano final confirmado em 2026-08-08 (16 perguntas de grilling).
- Vídeo: adapter plugável; candidatos NanoBanana e Sora; fallback TTS +
  slides (ffmpeg).
- Reversão: usuário removeu o fallback TTS/slides. Vídeo vem só da API de
  vídeo escolhida.
- Stack confirmada: Next.js 15 + TypeScript + Tailwind + shadcn/ui,
  Claude (entrevista/copy), adapter de vídeo, SSE, Vercel.
- Decisões da sessão gravadas em DECISIONS.md na raiz do repo.
- Pós-grilling (2026-08-08): marca da demo = iFood; pacote de dados
  mockados entregue pelo time; providers de vídeo = OpenAI (Sora) e
  Google (Veo) atrás do adapter, com seleção pela interface; chaves
  Anthropic e OpenAI disponíveis; planejamento completo escrito em
  `PLANO.md` (10 tarefas, execução por subagentes orquestrados).

### Decisões ou mudanças

- Iniciar sessão de grilling com o usuário antes de qualquer código.
- Criar checkpoints do projeto.

### Pendências

- Definir contexto de uso: pessoal, agência ou produto.
- Definir o contrato de entrada/saída de cada caixa.
- Definir plataformas e mecanismo de publicação.
- Definir escopo da gestão de tráfego.
- Definir pontos de validação humana.
