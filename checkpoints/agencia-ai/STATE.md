# Estado atual — agencia-ai

> Verdade vigente do projeto. Para evolução e evidências, consulte
> [JOURNAL.md](JOURNAL.md). Para terminologia, consulte
> [CONTEXT.md](CONTEXT.md). Decisões da sessão de grilling em
> [DECISIONS.md](../../DECISIONS.md).

## Objetivo

Pipeline de marketing digital automatizado: aprender sobre uma marca,
gerar criativos, publicar nas plataformas e gerir tráfego pago. Um agente
orquestrador coordena cada etapa, tratada como caixa preta.

## Escopo atual

### Incluído

- Sessão de grilling para fechar o desenho do pipeline (em andamento).
- Contexto de uso: projeto de aprendizado/hackathon com ambição de virar
  produto/startup.

### Adiado ou fora de escopo

- Implementação de código.
- Escolha de fornecedores/vendors específicos.

## Decisões vigentes

- Plano final confirmado pelo usuário (pipeline, contratos, demo, ordem de
  build).
- Provider de vídeo: plugável, opções NanoBanana e Sora (ainda não
  fechado). Sem fallback TTS/slides — o vídeo vem só da API de vídeo.

- Usar sessão grill-me para amadurecer a ideia antes de qualquer código.
- Cada etapa do pipeline é uma caixa preta orquestrada por um agente
  orquestrador.
- Contexto de uso: hackathon/startup, não operação pessoal nem SaaS
  maduro.
- Equipe dividida: criativo é feito por outra pessoa do time (manual); o
  time atual é dono de aprender + orquestrar + publicar + criar campanha.
- Criar campanha (tráfego/ads) é a parte principal do demo.
- Tracking é nice-to-have; pode cair se virar bloqueante.
- Plataformas escolhidas: Google (criar campanha) e Instagram Stories
  (publicar).
- Google é o primeiro plano (conta Google existe); Instagram Business é o
  segundo plano (não existe conta ainda).
- Caixa "aprender": entrada = upload de dados da empresa (mockável no demo)
  + entrevista estruturada do agente com o usuário usando esse contexto.
  Substitui a decisão anterior de "só entrevista".
- Orquestração por artefato compartilhado: cada caixa lê a workspace e
  escreve o que produz; nenhuma caixa conhece a outra; o orquestrador
  gerencia fila e estado.
- Caixa "criativo" (roteiro + produção): caixa única, dono = outra pessoa
  do time, **fora do escopo desta sessão**. Nosso design define só o
  contrato dela: entrada = brand-brief; saída = vídeo vertical + título +
  descrição + hashtags.
- Publicar e criar campanha: **mock-first** no demo — integração real é
  nice-to-have no código; na demo a equipe sobe manualmente e apresenta
  como capacidade do agente.
- Campanha do Google Ads aponta para landing page que hospeda o vídeo; o
  mesmo vídeo vai pro YouTube Shorts.
- Landing page: já existe (brandloop-lp.vercel.app), fora do pipeline.
- Deadline do hackathon: 3 horas. Escopo de construção agora é mínimo:
  orquestração + caixa aprender (entrevista → brief) + mocks das caixas
  3-4.
- Marca do demo: marca grande reconhecível, com dados mockados.
- Caixa 1 (aprender): usuário injeta arquivos da empresa → sistema ingere →
  chat adaptativo (estilo grill-me) só com o que faltar → fecha o
  diagnóstico nos termos da rubrica.
- Caixa 2 (criativo) É do escopo do time: copy gerada seguindo a rubrica
  de copywriting (RUBRICA DE COPYWRITING — BREAKTHROUGH ADVERTISING.md) +
  vídeo gerado via API. Saída: vídeo vertical + metadados.
- O contrato da caixa 1 passa a ser os insumos da rubrica: prospect, desejo
  dominante, nível de consciência, sofisticação de mercado, objeções,
  crenças, mecanismo, prova.
- Publicar e criar campanha: mock; não aparecem na demo (burocracia do
  Google Ads).
- Marca da demo: iFood. O pacote de dados mockados é entregue pelo time;
  o app é agnóstico de marca.
- Provider de vídeo: adapter com `openai` (Sora), `google` (Veo, se
  houver chave) e `mock` (MP4 em cache). Seleção pela interface; default
  via `VIDEO_PROVIDER`.
- Chaves disponíveis: Anthropic (Claude, primário) e OpenAI (GPT backup
  + Sora).
- Servidor stateless; estado do pipeline no hook orquestrador do
  cliente; cada caixa é uma rota de API independente.
- Planejamento ponta a ponta escrito em `PLANO.md` na raiz (2026-08-08),
  com 10 tarefas (T1–T10), contratos, cronograma de 3h e roteiro da
  demo.
- Adapter de LLM (T11): `lib/llm/` com providers `anthropic` e
  `openai`; resolução `LLM_PROVIDER` → Claude se chave → GPT se chave.
  Uma chave só basta para o fluxo inteiro.
- Análise de mercado via Gorilla (T12): etapa real dentro da caixa
  Aprender, depois da entrevista. `GORILLA_API_KEY` no `.env.local`.
  Pesquisa como a marca é comentada sobre o assunto X e alimenta o
  diagnóstico/criativo. Fora do escopo: etapa de métricas e otimização
  de campanha (decisão do usuário 2026-08-08).
- Mock automático por cota (T13): com chave de LLM presente mas conta
  sem crédito (429 credit_balance_exhausted), ingest/entrevista/copy
  caem em mock determinístico em vez de erro. `MOCK_LLM=1` força o
  mock sem chamada. Entrevista mock usa o diagnóstico real da Gorilla
  (evidence).

## Invariantes e requisitos

## Bloqueios

## Questões em aberto

- Qual LLM por caixa (Claude/GPT disponíveis; default Claude, backup GPT).
- Feedback loop de performance (fora do escopo do hack; futuro).

## Próximos passos

- Executar o `PLANO.md`: T1 → T2 → paralelas T3–T7 → T8 → T9 ∥ T10.
