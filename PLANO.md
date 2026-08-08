# PLANO — BrandLoop (agencia-ai)

> Plano ponta a ponta do build de hackathon. Prazo total: 3 horas.
> O orquestrador lê este arquivo, despacha as tarefas para subagentes e
> valida os gates. Os subagentes não têm contexto. Este arquivo é a
> única fonte de verdade deles.
> Decisões originais: [DECISIONS.md](DECISIONS.md).
> Rubrica de copy: [RUBRICA DE COPYWRITING — BREAKTHROUGH ADVERTISING.md](RUBRICA%20DE%20COPYWRITING%20—%20BREAKTHROUGH%20ADVERTISING.md).

## 1. Objetivo

Construir um web app que demonstra um pipeline de marketing com agentes
de IA. O pipeline tem quatro caixas pretas:

1. **Aprender** — o usuário faz upload de arquivos da marca. O sistema
   ingere os arquivos e roda uma entrevista adaptativa por chat. A
   entrevista fecha um diagnóstico nos termos da rubrica.
2. **Criativo** — o sistema gera a copy com a rubrica de Schwartz e gera
   um vídeo vertical por API. Antes do criativo, uma etapa de análise de
   mercado (Gorilla) mostra como a marca é comentada no mercado sobre o
   assunto X.
3. **Publicar** — mock de publicação no YouTube Shorts.
4. **Campanha** — mock de campanha no Google Ads. A campanha aponta para
   a landing page existente.

A demo ao vivo usa a marca iFood. Os dados da marca chegam em um pacote
de arquivos que o time entrega. O app não contém nada da marca no
código.

## 2. Decisões travadas

Não reabra estas decisões durante o build.

- Stack: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui.
- LLM: adapter `LLMProvider` com duas implementações: `anthropic`
  (Claude) e `openai` (GPT). Resolução: `LLM_PROVIDER` → Claude se
  houver chave → GPT se houver chave. Uma só chave é suficiente para
  o fluxo inteiro. Sem nenhuma chave, ingest usa fallback local.
- Análise de mercado: etapa real dentro da caixa Aprender, depois da
  entrevista. Usa a Gorilla API (`GORILLA_API_KEY`) para pesquisar
  como a marca é comentada no mercado sobre o assunto X. Resultado
  alimenta o diagnóstico e o criativo.
- Vídeo: adapter `VideoProvider` com três implementações: `openai`
  (Sora), `google` (Veo, só se houver chave) e `mock` (MP4 em cache).
- A seleção do provider de vídeo acontece na interface, em um seletor.
  O default vem da variável `VIDEO_PROVIDER`.
- Sem fallback de TTS ou slides. O vídeo vem da API de vídeo. O cache é
  um MP4 real gerado antes pela própria API.
- Publicar e Campanha são mocks dentro do app. Nenhuma integração real.
- Marca da demo: iFood. O pacote de dados do iFood é entregue pelo time
  (seção 7). O time não gera dados mockados no código.
- Landing page existente: `https://brandloop-lp.vercel.app`.
- O servidor é stateless. O estado do pipeline fica no cliente, no hook
  orquestrador. Cada caixa é uma rota de API independente.
- UI em PT-BR. O `videoPrompt` é em inglês. O texto na tela do vídeo é
  PT-BR.
- Deploy na Vercel. A demo roda de preferência em `pnpm dev` local. O
  deploy é a prova pública e o plano B.

## 3. Arquitetura

### 3.1 Fluxo do usuário

1. O usuário faz upload dos arquivos da marca ou cola texto de contexto.
2. O sistema chama `POST /api/ingest` e recebe um `BrandDigest`.
3. O sistema abre o chat e chama `POST /api/interview` em SSE.
4. A entrevista roda até o diagnóstico fechar ou o usuário forçar o
   fechamento.
5. O usuário aprova o diagnóstico.
6. O sistema chama `POST /api/copy` e recebe um `CopyPackage`.
7. O usuário aprova a copy e escolhe o provider de vídeo.
8. O sistema chama `POST /api/video` e recebe o vídeo.
9. O usuário aciona os mocks de Publicar e Campanha.
10. A tela final mostra o resumo e o link da landing page.

### 3.2 Máquina de estados

Etapa corrente: `aprender → criativo → publicar → campanha`.

Status por etapa: `pendente`, `em_andamento`, `aguardando_aprovacao`,
`concluido`, `erro`.

Dois gates humanos existem: aprovar o diagnóstico e aprovar a copy.

### 3.3 Rotas de API

| Rota | Caixa | Entrada | Saída |
| --- | --- | --- | --- |
| `POST /api/ingest` | Aprender | multipart com arquivos | `BrandDigest` |
| `POST /api/interview` | Aprender | `{ digest, history, partialDiagnosis, forceComplete }` | SSE com `InterviewEvent` |
| `POST /api/research` | Aprender | `{ digest, diagnosis }` | SSE com `ResearchEvent` |
| `POST /api/copy` | Criativo | `{ digest, diagnosis }` | `CopyPackage` |
| `GET /api/video` | Criativo | — | `{ available: VideoProviderId[], default: VideoProviderId }` |
| `POST /api/video` | Criativo | `{ videoPrompt, provider? }` | `VideoGenResult` |
| `POST /api/publish` | Publicar | `{ }` | `PublishResult` |
| `POST /api/campaign` | Campanha | `{ diagnosis }` | `CampaignResult` |

### 3.4 Regra das caixas pretas

Cada rota só conhece o próprio contrato de entrada e saída. Nenhuma
rota importa código de outra caixa. O hook orquestrador no cliente
passa a saída de uma caixa como entrada da próxima.

## 4. Contratos de dados

Este bloco é o conteúdo exato de `lib/contracts.ts`. Nenhum subagente
altera este arquivo. Se um contrato parecer errado, o subagente para e
reporta ao orquestrador.

```ts
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
```

## 5. Mapa de arquivos final

```text
app/
  layout.tsx
  page.tsx
  globals.css
  api/
    ingest/route.ts
    interview/route.ts
    copy/route.ts
    video/route.ts
    publish/route.ts
    campaign/route.ts
components/
  ui/                        # shadcn/ui
  pipeline/
    Stepper.tsx
    UploadPanel.tsx
    ChatPanel.tsx
    DiagnosisGrid.tsx
    CopyPanel.tsx
    VideoPanel.tsx
    MocksPanel.tsx
    ProviderSelect.tsx
lib/
  contracts.ts               # seção 4, imutável
  orchestrator.ts            # hook usePipeline no cliente
  utils.ts
  copy-rubric.md             # cópia exata da rubrica
  boxes/
    ingest.ts
    interviewPrompt.ts
    copyPrompt.ts
  video/
    types.ts
    openai.ts
    google.ts
    mock.ts
    index.ts                 # factory getProvider
  mocks/
    publish.ts
    campaign.ts
demo/
  ifood/                     # pacote entregue pelo time (seção 7)
public/
  videos/
    .gitkeep
    ifood-cache.mp4          # gerado na tarefa T9
PLANO.md
DECISIONS.md
```

## 6. Variáveis de ambiente

| Variável | Obrigatória | Default | Uso |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | não* | — | Claude (entrevista, ingestão, copy) |
| `ANTHROPIC_MODEL` | não | `claude-sonnet-4-5` | id do modelo Claude |
| `OPENAI_API_KEY` | não* | — | GPT e vídeo Sora |
| `OPENAI_MODEL` | não | `gpt-4o` | id do modelo GPT |
| `OPENAI_VIDEO_MODEL` | não | `sora-2` | id do modelo de vídeo OpenAI |
| `GOOGLE_GENERATIVE_AI_API_KEY` | não | — | provider de vídeo Google |
| `GOOGLE_VIDEO_MODEL` | não | `veo-3` | id do modelo de vídeo Google |
| `LLM_PROVIDER` | não | — | força `anthropic` ou `openai` |
| `GORILLA_API_KEY` | não | — | análise de mercado (etapa Gorilla) |
| `VIDEO_PROVIDER` | não | `openai` | `openai`, `google` ou `mock` |
| `VIDEO_CACHE_PATH` | não | `/videos/ifood-cache.mp4` | MP4 servido pelo provider mock |
| `LANDING_PAGE_URL` | não | `https://brandloop-lp.vercel.app` | destino da campanha e do CTA |

Se um modelo responder 404, o responsável confere o nome exato na conta
e ajusta a variável. Não altere código por causa de nome de modelo.

## 7. Dependência externa: pacote iFood

O time entrega o pacote. O build não espera parado. O app é agnóstico
de marca, então as tarefas T1 a T8 usam qualquer texto de teste.

Contrato do pacote:

1. Pasta `demo/ifood/` com 3 a 6 arquivos `.md` ou `.txt`.
2. Tamanho total máximo de 60 KB.
3. Conteúdo em PT-BR.
4. Fatos públicos e reais sobre a marca. Não inventar números internos.
5. Cobertura mínima: o que a marca vende, quem é o público, quais dores
   o público tem, tom de voz, campanhas conhecidas.

Prazo: antes da tarefa T9. Se o pacote atrasar, T9 roda com um
diagnóstico parcial digitado no campo de colar texto.

## 8. Tarefas

### Briefing comum dos subagentes

Todo prompt de subagente começa com este texto, sem alterações:

```text
Você executa uma tarefa do build do BrandLoop, um app de hackathon em
Next.js 15 + TypeScript + Tailwind + shadcn/ui. O app demonstra um
pipeline de marketing com IA em quatro caixas: Aprender, Criativo,
Publicar (mock) e Campanha (mock).

Antes de codar, leia o arquivo PLANO.md na raiz do repositório, nas
seções indicadas no seu prompt. Se lib/contracts.ts já existir, leia
também e respeite sem alterar.

Regras fixas:
1. Toque apenas nos arquivos listados no seu prompt.
2. UI em PT-BR.
3. Rode `pnpm build` ao final e corrija qualquer erro.
4. Não rode nenhum comando git.
5. Se algo do plano for impossível, pare e reporte o desvio com clareza.
```

### T1 — Scaffold e base visual

- **Tempo:** 15 min.
- **Depende de:** nada.
- **Arquivos:** `package.json`, `app/layout.tsx`, `app/page.tsx`,
  `app/globals.css`, `components/ui/*`, `lib/utils.ts`, `.env.example`.

Passos:

1. Rode o scaffold do Next.js 15 com TypeScript, Tailwind, ESLint, App
   Router, sem `src/`, import alias `@/*`, com pnpm. Se o scaffold
   recusar a pasta por causa dos arquivos `.md`, faça o scaffold em
   pasta temporária e mova os arquivos gerados para a raiz. Preserve
   `.git/` e os `.md` existentes.
2. Inicialize o shadcn/ui no estilo `new-york`, cor base `zinc`.
3. Adicione os componentes: `button`, `card`, `badge`, `textarea`,
   `input`, `select`, `progress`, `separator`, `scroll-area`, `sonner`.
4. Instale as dependências: `@anthropic-ai/sdk`, `openai`,
   `@google/genai`, `zod`.
5. Ative o tema dark por default no `layout.tsx` (classe `dark` no
   `html`). Use a fonte Inter via `next/font`.
6. Crie `.env.example` com todas as variáveis da seção 6, sem valores.
7. Deixe `app/page.tsx` com um placeholder centralizado: título
   `BrandLoop` e subtítulo `Pipeline de marketing com agentes`.

Critérios de aceite:

- `pnpm build` passa sem erros.
- `pnpm dev` mostra o placeholder em tema dark.

Prompt do subagente:

```text
[ briefing comum ]

Tarefa T1 — Scaffold e base visual.
Leia PLANO.md seções 2, 5 e 6.
Execute os passos 1 a 7 da tarefa T1.
Critérios de aceite: `pnpm build` verde e página placeholder no ar.
Ao terminar, reporte: comandos rodados, arquivos criados, saída do build.
```

### T2 — Contratos, orquestrador e casca navegável

- **Tempo:** 15 min.
- **Depende de:** T1.
- **Arquivos:** `lib/contracts.ts`, `lib/orchestrator.ts`,
  `app/page.tsx`, `components/pipeline/Stepper.tsx`,
  `components/pipeline/UploadPanel.tsx`,
  `components/pipeline/ChatPanel.tsx`,
  `components/pipeline/DiagnosisGrid.tsx`,
  `components/pipeline/CopyPanel.tsx`,
  `components/pipeline/VideoPanel.tsx`,
  `components/pipeline/MocksPanel.tsx`,
  `components/pipeline/ProviderSelect.tsx`.

Passos:

1. Crie `lib/contracts.ts` com o conteúdo exato da seção 4.
2. Crie `lib/orchestrator.ts` com o hook `usePipeline`. Use
   `useReducer` com o estado `PipelineState`. Ações: `SET_STATUS`,
   `SET_DIGEST`, `MERGE_PARTIAL_DIAGNOSIS`, `SET_DIAGNOSIS`, `SET_COPY`,
   `SET_VIDEO`, `SET_PUBLISH`, `SET_CAMPAIGN`, `RESET`. Exporte funções
   finas de fetch: `callIngest`, `callCopy`, `callVideo`,
   `callPublish`, `callCampaign`. Não implemente a entrevista aqui. O
   `ChatPanel` cuida do SSE na T4.
3. Crie `Stepper.tsx` com as quatro etapas e os cinco status. Mostre o
   status com cor e ícone.
4. Crie os painéis como stubs tipados. Cada painel recebe props dos
   contratos e renderiza dados de exemplo internos. Marque cada stub
   com `// TODO(Tx)`.
5. Monte `app/page.tsx` em coluna única: header fixo com `Stepper`, e
   os painéis em sequência. Use o estado fake do reducer, sem rede.

Critérios de aceite:

- `pnpm build` passa.
- A página mostra as quatro etapas e os painéis com dados falsos.
- Nenhuma chamada de rede acontece.

Prompt do subagente:

```text
[ briefing comum ]

Tarefa T2 — Contratos, orquestrador e casca navegável.
Leia PLANO.md seções 3, 4 e 5.
Execute os passos 1 a 5 da tarefa T2.
Critérios de aceite: build verde, página com etapas e painéis falsos,
zero chamadas de rede.
Ao terminar, reporte: arquivos criados, saída do build, desvios.
```

### T3 — Ingestão, upload e grade do diagnóstico

- **Tempo:** 20 min.
- **Depende de:** T2. Roda em paralelo com T4, T5, T6 e T7.
- **Arquivos:** `app/api/ingest/route.ts`, `lib/boxes/ingest.ts`,
  `components/pipeline/UploadPanel.tsx`,
  `components/pipeline/DiagnosisGrid.tsx`.

Passos:

1. Em `lib/boxes/ingest.ts`, extraia texto de arquivos `.txt`, `.md` e
   `.markdown`. Rejeite outros tipos com erro 400. Limite o total a
   200 KB.
2. Condense o texto com Claude (`ANTHROPIC_MODEL`) em um `BrandDigest`.
   Use tool use com schema JSON. O resumo tem no máximo 400 caracteres.
   Os fatos são bullets curtos e fiéis ao texto. Nunca invente fatos.
3. Sem `ANTHROPIC_API_KEY`, use o fallback local: resumo igual aos
   primeiros 1500 caracteres e fatos iguais às linhas de heading.
4. Em `app/api/ingest/route.ts`, receba multipart, rode a ingestão e
   devolva o `BrandDigest` em JSON. Erros com `{ message }` claro.
5. Em `UploadPanel.tsx`, implemente: input de arquivos múltiplos, lista
   de arquivos com remoção, textarea `Ou cole o contexto da marca` (o
   texto vira um arquivo virtual `contexto.md`), botão `Aprender sobre
   a marca`, estados de loading e erro. Sucesso chama a prop
   `onDigest`.
6. Em `DiagnosisGrid.tsx`, renderize um card para cada um dos oito
   campos de `Diagnosis`. Campo vazio mostra `Pendente`. O grid aceita
   `Partial<Diagnosis>` e preenche aos poucos.

Critérios de aceite:

- `curl -F "files=@exemplo.md" localhost:3000/api/ingest` devolve um
  `BrandDigest` válido.
- O grid renderiza um diagnóstico parcial sem quebrar.
- `pnpm build` passa.

Prompt do subagente:

```text
[ briefing comum ]

Tarefa T3 — Ingestão, upload e grade do diagnóstico.
Leia PLANO.md seções 3, 4, 5 e 6. Leia lib/contracts.ts.
Execute os passos 1 a 6 da tarefa T3.
Critérios de aceite: curl de ingestão devolve BrandDigest válido,
DiagnosisGrid tolera parciais, build verde.
Ao terminar, reporte: arquivos criados, comando curl usado e saída,
saída do build, desvios.
```

### T4 — Entrevista em SSE e chat

- **Tempo:** 25 min.
- **Depende de:** T2. Roda em paralelo com T3, T5, T6 e T7.
- **Arquivos:** `app/api/interview/route.ts`,
  `lib/boxes/interviewPrompt.ts`, `components/pipeline/ChatPanel.tsx`.

Passos:

1. Em `lib/boxes/interviewPrompt.ts`, monte o system prompt. Regras do
   entrevistador: fala PT-BR; tom direto, estilo entrevista de
   diagnóstico; faz uma pergunta por vez; usa os fatos do
   `BrandDigest`; mira os campos vazios de `Partial<Diagnosis>`; faz no
   máximo 8 perguntas; marca `complete: true` quando os oito campos
   tiverem conteúdo ou quando `forceComplete` chegar. A saída é sempre
   um JSON `InterviewTurn` via tool use. O campo `message` é a próxima
   fala do entrevistador.
2. Em `app/api/interview/route.ts`, receba
   `{ digest, history, partialDiagnosis, forceComplete }`. Chame Claude
   com streaming. Emita SSE com um evento por linha no formato
   `data: {...}\n\n`. Sequência: eventos `token` com o texto de
   `message`, depois um evento `turn` com o `InterviewTurn` completo.
   Erros viram evento `error`. Defina `export const maxDuration = 120`.
3. Em `ChatPanel.tsx`, renderize o histórico em bolhas. Envie a resposta
   do usuário com POST e leia o SSE com `fetch` + `getReader()`.
   Decodifique linhas `data:`. Mostre tokens ao vivo. No evento `turn`,
   chame a prop `onTurn`. Adicione o botão `Fechar diagnóstico agora`,
   que repete a chamada com `forceComplete: true`.
4. Desabilite o input durante o streaming.

Critérios de aceite:

- `curl -N -X POST localhost:3000/api/interview -H 'content-type:
  application/json' -d '<payload de teste>'` mostra eventos `token` e
  um evento `turn` com JSON válido.
- `pnpm build` passa.

Prompt do subagente:

```text
[ briefing comum ]

Tarefa T4 — Entrevista em SSE e chat.
Leia PLANO.md seções 3, 4, 5 e 6. Leia lib/contracts.ts.
Execute os passos 1 a 4 da tarefa T4.
Critérios de aceite: curl -N mostra tokens e turn final válido,
build verde.
Ao terminar, reporte: arquivos criados, comando curl usado e trecho da
saída SSE, saída do build, desvios.
```

### T5 — Copy com a rubrica e painel de copy

- **Tempo:** 25 min.
- **Depende de:** T2. Roda em paralelo com T3, T4, T6 e T7.
- **Arquivos:** `app/api/copy/route.ts`, `lib/boxes/copyPrompt.ts`,
  `lib/copy-rubric.md`, `components/pipeline/CopyPanel.tsx`.

Passos:

1. Copie o conteúdo de `RUBRICA DE COPYWRITING — BREAKTHROUGH
   ADVERTISING.md` para `lib/copy-rubric.md`, sem editar nada.
2. Em `lib/boxes/copyPrompt.ts`, monte o system prompt: o texto da
   rubrica lido de `lib/copy-rubric.md` (via `fs.readFileSync`) mais as
   regras de saída. Regras de saída: tudo em PT-BR; respeite o nível de
   consciência e a sofisticação do `Diagnosis`; nunca invente provas;
   `roteiro` com 3 a 5 cenas e 15 a 30 segundos no total; `titulo` com
   no máximo 100 caracteres; 3 a 5 `hashtags`; `cta` aponta para
   `LANDING_PAGE_URL`; `videoPrompt` em inglês, descreve a cena 1,
   formato vertical 9:16, texto na tela em PT-BR com no máximo 3
   palavras.
3. Em `app/api/copy/route.ts`, receba `{ digest, diagnosis }`. Chame
   Claude com tool use no schema de `CopyPackage`. Valide a saída com
   zod. Em JSON inválido, tente mais uma vez com a mensagem de erro
   anexada. Devolva o `CopyPackage`.
4. Em `CopyPanel.tsx`, mostre: headline em destaque, roteiro por cena
   (fala, texto na tela, duração), metadados do vídeo e `videoPrompt`
   em bloco recolhível. Botões: `Regenerar copy` (prop `onRegenerate`)
   e `Aprovar e gerar vídeo` (prop `onApprove`).

Critérios de aceite:

- `curl -X POST localhost:3000/api/copy` com um diagnóstico de exemplo
  devolve um `CopyPackage` válido contra o schema.
- `pnpm build` passa.

Prompt do subagente:

```text
[ briefing comum ]

Tarefa T5 — Copy com a rubrica e painel de copy.
Leia PLANO.md seções 3, 4, 5 e 6. Leia lib/contracts.ts.
A rubrica está em "RUBRICA DE COPYWRITING — BREAKTHROUGH ADVERTISING.md".
Execute os passos 1 a 4 da tarefa T5.
Critérios de aceite: curl de copy devolve CopyPackage válido,
build verde.
Ao terminar, reporte: arquivos criados, comando curl usado e saída,
saída do build, desvios.
```

### T6 — Adapter de vídeo e painel de vídeo

- **Tempo:** 35 min. É a tarefa mais longa da fase paralela.
- **Depende de:** T2. Roda em paralelo com T3, T4, T5 e T7.
- **Arquivos:** `lib/video/types.ts`, `lib/video/openai.ts`,
  `lib/video/google.ts`, `lib/video/mock.ts`, `lib/video/index.ts`,
  `app/api/video/route.ts`, `components/pipeline/VideoPanel.tsx`,
  `components/pipeline/ProviderSelect.tsx`, `public/videos/.gitkeep`.

Passos:

1. Em `lib/video/types.ts`, reexporte `VideoProvider`,
   `VideoProviderId`, `VideoGenInput` e `VideoGenResult` de
   `lib/contracts.ts`.
2. Em `lib/video/openai.ts`, implemente o provider com o pacote
   `openai` instalado. Antes de codar, leia os tipos da API de vídeo em
   `node_modules/openai` para descobrir a assinatura real. Fluxo:
   crie o job com `OPENAI_VIDEO_MODEL`, prompt e formato vertical;
   faça poll a cada 5 segundos com teto de 240 segundos; baixe o MP4;
   salve em `public/videos/<jobId>.mp4`; devolva o caminho público.
3. Em `lib/video/google.ts`, implemente o mesmo contrato com
   `@google/genai` e `GOOGLE_VIDEO_MODEL`. Leia os tipos do pacote
   antes de codar. Este provider só existe se
   `GOOGLE_GENERATIVE_AI_API_KEY` estiver definida.
4. Em `lib/video/mock.ts`, espere 3 segundos. Se `VIDEO_CACHE_PATH`
   existir em `public/`, devolva esse caminho com `fromCache: true`.
   Senão devolva `SAMPLE_VIDEO_URL` de desenvolvimento com
   `fromCache: false`.
5. Em `lib/video/index.ts`, implemente `getProvider(id?)`. Ordem de
   resolução: parâmetro, depois `VIDEO_PROVIDER`, depois `openai` se
   houver chave, depois `mock`. Exporte `listAvailableProviders()`.
6. Em `app/api/video/route.ts`: `GET` devolve
   `{ available, default }`; `POST` recebe `{ videoPrompt, provider? }`
   e devolve `VideoGenResult`. Defina `export const maxDuration = 300`.
   Erros com `message` clara: `sem chave`, `timeout`, `falha no
   provider`.
7. Em `ProviderSelect.tsx`, carregue `GET /api/video` e mostre um
   `select` com os providers disponíveis e o default marcado.
8. Em `VideoPanel.tsx`, mostre o player `<video controls>`, o
   `ProviderSelect`, o botão `Gerar vídeo` e o estado de progresso com
   a mensagem `Gerando vídeo, isso pode levar até 4 minutos`. Erro
   mostra retry.

Critérios de aceite:

- Com `VIDEO_PROVIDER=mock`, `curl -X POST localhost:3000/api/video`
  devolve `videoUrl`.
- `GET /api/video` lista os providers coerentes com as chaves
  presentes.
- `pnpm build` passa.

Prompt do subagente:

```text
[ briefing comum ]

Tarefa T6 — Adapter de vídeo e painel de vídeo.
Leia PLANO.md seções 2, 3, 4, 5 e 6. Leia lib/contracts.ts.
Execute os passos 1 a 8 da tarefa T6. No passo 2 e no passo 3, leia os
tipos do pacote instalado antes de codar. Não adivinhe assinaturas.
Critérios de aceite: POST com mock devolve videoUrl, GET lista
providers, build verde.
Ao terminar, reporte: arquivos criados, assinatura real encontrada da
API de vídeo, comandos curl e saídas, saída do build, desvios.
```

### T7 — Mocks de Publicar e Campanha

- **Tempo:** 15 min.
- **Depende de:** T2. Roda em paralelo com T3, T4, T5 e T6.
- **Arquivos:** `app/api/publish/route.ts`,
  `app/api/campaign/route.ts`, `lib/mocks/publish.ts`,
  `lib/mocks/campaign.ts`, `components/pipeline/MocksPanel.tsx`.

Passos:

1. Em `lib/mocks/publish.ts`, espere 1,5 segundo e devolva um
   `PublishResult`. URL fake no formato
   `https://youtube.com/shorts/brandloop-<6 chars aleatórios>`.
   `simulado: true` sempre.
2. Em `lib/mocks/campaign.ts`, espere 1,5 segundo e monte um
   `CampaignResult` a partir do `Diagnosis`. Monte `segmentacao` com 3
   bullets derivados de `prospect` e `desejoDominante`, em texto puro,
   sem LLM. `orcamentoDiario` fixo em 50. `landingPage` vem de
   `LANDING_PAGE_URL`. `simulado: true` sempre.
3. Crie as duas rotas POST devolvendo JSON.
4. Em `MocksPanel.tsx`, mostre dois cards com o badge `Simulado`. Cada
   card tem um botão (`Publicar no YouTube Shorts`, `Criar campanha no
   Google Ads`) e mostra o payload retornado.

Critérios de aceite:

- Os dois curls devolvem JSON válido com `simulado: true`.
- `pnpm build` passa.

Prompt do subagente:

```text
[ briefing comum ]

Tarefa T7 — Mocks de Publicar e Campanha.
Leia PLANO.md seções 3, 4, 5 e 6. Leia lib/contracts.ts.
Execute os passos 1 a 4 da tarefa T7.
Critérios de aceite: curls devolvem JSON com simulado true, build
verde.
Ao terminar, reporte: arquivos criados, curls e saídas, saída do
build, desvios.
```

### T8 — Integração ponta a ponta e polish

- **Tempo:** 30 min.
- **Depende de:** T3, T4, T5, T6 e T7 prontas e com build verde.
- **Arquivos:** `app/page.tsx`, `lib/orchestrator.ts` (só se precisar),
  ajustes de wiring nos painéis.

Passos:

1. Substitua o estado fake de `app/page.tsx` pelo `usePipeline` real.
2. Ligue o fluxo: upload chama ingest e guarda o digest; o chat roda a
   entrevista e faz merge do diagnóstico parcial no `DiagnosisGrid`;
   o gate `Aprovar diagnóstico` fixa o `Diagnosis`; a copy é gerada; o
   gate `Aprovar e gerar vídeo` chama o vídeo; os mocks rodam em
   sequência; a tela final mostra o resumo e o link da landing page.
3. Avance o `Stepper` a cada etapa concluída. Marque `erro` com retry
   por etapa.
4. Adicione toasts de erro com `sonner`. Mensagens curtas em PT-BR.
5. Polish: estados vazios apresentáveis, spinners, transição suave do
   stepper, layout em coluna única responsivo, header com o nome
   `BrandLoop`.

Critérios de aceite:

- Fluxo manual completo com `VIDEO_PROVIDER=mock`, do upload à tela
  final.
- Console sem erros.
- `pnpm build` passa.

Prompt do subagente:

```text
[ briefing comum ]

Tarefa T8 — Integração ponta a ponta e polish.
Leia PLANO.md seções 1, 2, 3, 4 e 8 (T8). Leia lib/contracts.ts e
lib/orchestrator.ts.
Execute os passos 1 a 5 da tarefa T8.
Critérios de aceite: fluxo manual completo com mock de vídeo, console
limpo, build verde.
Ao terminar, reporte: arquivos alterados, evidência do fluxo completo
(passos executados), saída do build, desvios.
```

### T9 — Pré-aquecer o vídeo do iFood e ensaiar a demo

- **Tempo:** 30 min.
- **Depende de:** T8 e do pacote iFood (seção 7).
- **Arquivos:** `public/videos/ifood-cache.mp4`, `DEMO.md`.

Passos:

1. Rode o app local com `VIDEO_PROVIDER=openai` e chave real.
2. Execute o fluxo com o pacote iFood até aprovar um vídeo bom.
3. Copie o MP4 gerado para `public/videos/ifood-cache.mp4`.
4. Em `.env.local`, defina `VIDEO_PROVIDER=mock` e
   `VIDEO_CACHE_PATH=/videos/ifood-cache.mp4`.
5. Ensaie a demo duas vezes com cronômetro.
6. Anote em `DEMO.md`: três respostas prontas para a entrevista, o
   tempo de cada etapa e as frases de transição.

Critérios de aceite:

- A demo completa roda em até 7 minutos.
- O vídeo aparece em segundos via cache.

Execução: o orquestrador roda esta tarefa com o usuário. Não despache
para subagente.

### T10 — Deploy na Vercel e verificação final

- **Tempo:** 20 min. Roda em paralelo com T9.
- **Depende de:** T8.
- **Arquivos:** nenhum arquivo novo. Só infraestrutura.

Passos:

1. Suba o repositório no GitHub, se ainda não existir remoto.
2. Importe o projeto na Vercel.
3. Configure as variáveis da seção 6. Em produção, use
   `VIDEO_PROVIDER=mock`.
4. Rode um smoke test no deploy: fluxo até a copy, sem gerar vídeo
   real.
5. Rode o checklist da seção 12.

Critérios de aceite:

- URL pública abre o fluxo.
- Build da Vercel verde.

Execução: o orquestrador roda esta tarefa com o usuário. O usuário
executa logins e confirmações de conta.

### T12 — Análise de mercado via Gorilla (pós-entrevista)

- **Tempo:** 30 min.
- **Depende de:** T8, T11 e contratos atualizados (MarketAnalysis).
- **Arquivos novos:** `lib/boxes/gorilla.ts`, `lib/boxes/researchQuery.ts`,
  `app/api/research/route.ts`, `components/pipeline/AnalysisPanel.tsx`.
- **Arquivos modificados:** `lib/orchestrator.ts` (ação SET_RESEARCH +
  caller), `app/page.tsx` (ligação do fluxo), `.env.example`
  (`GORILLA_API_KEY` sem valor).

Objetivo: depois que o usuário aprova o diagnóstico, o pipeline roda
uma análise de mercado real na Gorilla API. A análise mostra como a
marca é comentada no mercado sobre o assunto X. O usuário aprova a
análise e só então o criativo é gerado.

Passos:

1. Em `lib/boxes/researchQuery.ts`, use o adapter de LLM
   (`generateStructured`) para transformar `{ digest, diagnosis }` em
   uma query de busca: schema `{ assunto: string, queries: string[] }`
   com 3 a 5 frases de busca em PT-BR, alinhadas ao prospect e ao
   desejo dominante (ex.: "taxa do iFood come minha margem
   restaurante"). Assunto é o tema central das buscas.
2. Em `lib/boxes/gorilla.ts`, implemente o cliente da Gorilla. Base:
   `https://usegorilla.app/v1`. Headers: `x-api-key: <GORILLA_API_KEY>`,
   `Content-Type: application/json`, `Accept: application/json` e um
   `User-Agent` de navegador (a API bloqueia clientes sem UA real).
   Fluxo: POST `/v2-search-stream` com `{ query, mode: "ranked",
   since: "3mo", limit: 80, custom_schema }`; faça poll de GET
   `/v2-search-stream?id=<search_id>` a cada 3 segundos até
   `status != "running"` (teto de 240 s); leia o campo `data` do
   custom_schema. Use `fetch` do Node.
3. O `custom_schema` é igual ao usado nas evidências do pacote iFood
   (`demo/ifood/evidence/reproduzir-mercado.py`): prospect,
   desejo_dominante, estado_de_consciencia (enum PT), sofisticacao
   (1-5), crencas/objecoes/prova como array de `{ texto,
   evidencia_url }`, mencoes_concorrente `{ concorrente, motivo,
   evidencia_url }`, linguagem_do_prospect (string[]),
   mecanismo_sugerido.
4. Em `lib/boxes/gorilla.ts`, mapeie a saída para `MarketAnalysis`
   (contrato em `lib/contracts.ts`): estado_de_consciencia PT →
   AwarenessLevel; sofisticacao 1-5 → 'baixa'|'media'|'alta'; inclua
   `creditosGastos` (do campo `credits_charged` da resposta).
5. Em `app/api/research/route.ts`, receba `{ digest, diagnosis }` e
   devolva SSE com `ResearchEvent` (defina no próprio arquivo):
   `{ type: 'status', value }` com progresso em PT-BR ("Preparando a
   busca...", "Pesquisando no mercado (X/Y fontes)...",
   "Estruturando análise..."), depois `{ type: 'analysis', value:
   MarketAnalysis }`, e `{ type: 'error', message }` em falha.
   `maxDuration = 300`. Sem `GORILLA_API_KEY`, evento error com
   "GORILLA_API_KEY não configurada: defina a chave para a análise de
   mercado."
6. Em `lib/orchestrator.ts`, adicione a ação `SET_RESEARCH` e a função
   `callResearch` (lê SSE como a entrevista).
7. Em `components/pipeline/AnalysisPanel.tsx`, mostre: durante a busca,
   os eventos `status` ao vivo; depois, o assunto, o resumo, crenças e
   objeções com links de evidência, linguagem do prospect (citações),
   concorrentes mencionados, mecanismo sugerido e provas. Botão
   "Aprovar e gerar copy" (prop `onApprove`). Props: `research`,
   `running`, `statusText`, `onApprove`.
8. Em `app/page.tsx`, mude o fluxo: aprovar o diagnóstico inicia a
   pesquisa (etapa aprender fica `em_andamento`); quando a análise
   chega, mostra o AnalysisPanel com `aguardando_aprovacao`; aprovar a
   análise fecha a etapa aprender (`concluido`) e dispara a copy.
   Sem chave, o erro aparece com retry.

Critérios de aceite:

- `pnpm build` verde.
- Com a chave real, o fluxo aprovar-diagnóstico → pesquisa funciona e
  devolve `MarketAnalysis` válido (teste real, ~80 s, com eventos
  status visíveis).
- Contrato SSE inalterado para as outras rotas.

Execução: o orquestrador roda a verificação real com o usuário, por
causa do custo da busca Gorilla.

### T13 — Mock automático quando a API de LLM não tem crédito

- **Tempo:** 25 min.
- **Depende de:** T11, T12 e do mock de entrevista já existente
  (`lib/mocks/interview.ts`, do time).
- **Arquivos novos:** `lib/mocks/copy.ts`.
- **Arquivos modificados:** `lib/llm/types.ts` (helper `isQuotaError`),
  `lib/boxes/ingest.ts`, `lib/boxes/researchQuery.ts`,
  `app/api/interview/route.ts`, `app/api/copy/route.ts`,
  `.env.example` (`MOCK_LLM=`).

Objetivo: o app não quebra quando a chave de LLM existe mas a conta
está sem crédito (erro 429 `credit_balance_exhausted`). Cada caixa
cai no mock determinístico no lugar de erro. O modo automático é
detectado no erro; `MOCK_LLM=1` força o mock sem chamada nenhuma.

Passos:

1. Em `lib/llm/types.ts`, exporte `isQuotaError(error: unknown):
   boolean`. Detecta 429, `insufficient_quota`,
   `credit_balance_exhausted` e "no credits" no texto do erro.
2. Em `lib/mocks/copy.ts`, crie `mockCopyPackage(diagnosis)`:
   deterministico, 3 cenas (gancho, mecanismo, CTA), headline por
   template a partir de desejoDominante, titulo ≤100 chars, 3-5
   hashtags, cta com LANDING_PAGE_URL, videoPrompt em ingles com texto
   na tela PT-BR ≤3 palavras. Exporte `isMockLLMForced()` que lê
   `MOCK_LLM=1`.
3. `app/api/copy/route.ts`: sem provider, com `MOCK_LLM=1`, ou em erro
   de quota → devolve o `mockCopyPackage`.
4. `app/api/interview/route.ts`: além da condição atual, em erro de
   quota (catch) → roda o mock determinístico da entrevista no lugar
   do evento error.
5. `lib/boxes/ingest.ts`: `MOCK_LLM=1` ou erro de quota → fallback
   local (resumo + headings) em vez de erro.
6. `lib/boxes/researchQuery.ts`: sem provider ou `MOCK_LLM=1` →
   template deterministico (assunto = desejoDominante; 3 queries por
   template). A busca Gorilla em si continua real.
7. `.env.example`: adicione `MOCK_LLM=` com comentário.

Critérios de aceite:

- Com a chave OpenAI sem crédito, o fluxo inteiro funciona com mock:
  ingest (fallback), entrevista (roteiro), copy (mock), pesquisa
  (Gorilla real), vídeo (mock).
- Sem `MOCK_LLM`, a queda para mock é automática no 429.
- `pnpm build` verde.

Execução: o orquestrador roda a verificação com o usuário.

## 9. Execução do orquestrador

### 9.1 Ordem e paralelismo

```text
T1 → T2 → [ T3 ∥ T4 ∥ T5 ∥ T6 ∥ T7 ] → T8 → [ T9 ∥ T10 ] → T11 → T12 → T13
```

### 9.2 Cronograma

| Janela | Trabalho |
| --- | --- |
| 0:00–0:15 | T1 |
| 0:15–0:30 | T2 |
| 0:30–1:20 | T3 ∥ T4 ∥ T5 ∥ T6 ∥ T7 |
| 1:20–1:50 | T8 |
| 1:50–2:30 | T9 ∥ T10 |
| 2:30–3:00 | Buffer de correção e ensaio final |

### 9.3 Gates

1. **Gate F0:** depois de T2. Exija build verde e a casca navegável.
2. **Gate F1/F2:** depois das paralelas. Exija os curls de cada rota e
   build verde. Só então despache T8.
3. **Gate F3:** depois de T8. Exija o fluxo manual completo com mock.
4. **Gate final:** checklist da seção 12.

### 9.4 Regras de despacho

1. Um subagente por tarefa. Prompt completo, colado da seção 8.
2. Subagente padrão do build: `construtor` (definido em
   `.opencode/agent/construtor.md`, DeepSeek V4 Flash com reasoning
   máximo).
3. Nunca rode duas tarefas que tocam o mesmo arquivo em paralelo.
4. `lib/contracts.ts` é imutável. Pedidos de mudança sobem para o
   orquestrador.
5. Todo relatório de subagente precisa conter: arquivos tocados, saída
   do build, comandos de verificação e desvios.
6. Desvio de contrato ou de rota bloqueia a fase. Corrija antes de
   seguir.
7. Subagente não roda git. O orquestrador controla commits, se houver.

## 10. Roteiro da demo

Tempo total alvo: 6 minutos.

1. **Abertura (0:30).** Mostre o problema: marketing digital exige
   diagnóstico, copy, vídeo, publicação e tráfego. Apresente o
   BrandLoop como o pipeline que faz isso com agentes.
2. **Upload (0:30).** Arraste os arquivos do pacote iFood. Comente que
   o sistema aprende com o material bruto da marca.
3. **Entrevista (2:00).** Responda 2 ou 3 perguntas com as respostas
   prontas do `DEMO.md`. Mostre o diagnóstico se preenchendo ao vivo.
   Force o fechamento se precisar.
4. **Diagnóstico (0:30).** Leia prospect, desejo dominante e nível de
   consciência. Aprove.
5. **Copy (1:00).** Leia a headline e uma cena do roteiro. Aprove.
6. **Vídeo (1:00).** Gere com o provider mock. O vídeo real pré-gravado
   aparece em segundos. Comente que veio da API de vídeo.
7. **Mocks (0:30).** Acione Publicar e Campanha. Aponte o badge
   `Simulado` e a landing page como destino.
8. **Fechamento (0:30).** Repita a tese: cada caixa é preta e o
   orquestrador conduz o fluxo. Próximo passo seria a integração real.

Se o vídeo falhar ao vivo: o cache é o plano A. Se a LLM falhar:
recarregue e rode de novo com o cache quente. Nunca improvise uma
integração real.

## 11. Plano de corte

Acione nesta ordem quando o tempo apertar:

1. Corte `lib/video/google.ts`. Ficam `openai` e `mock`.
2. Corte o streaming token a token da entrevista. Mande a resposta
   inteira em um evento `turn`.
3. Corte o deploy. A demo roda local.
4. Corte polish visual. Mantenha só estados de loading e erro.

Nunca corte: os dois gates de aprovação, os contratos da seção 4 e os
badges `Simulado`.

## 12. Checklist final de aceite

- [ ] `pnpm build` verde.
- [ ] Fluxo completo local com `VIDEO_PROVIDER=mock`.
- [ ] Entrevista fecha o diagnóstico em até 8 perguntas.
- [ ] Botão `Fechar diagnóstico agora` funciona.
- [ ] Copy segue a rubrica e não inventa provas.
- [ ] Análise de mercado (Gorilla) roda depois do diagnóstico e
  aparece com evidências linkadas.
- [ ] `ifood-cache.mp4` toca no player.
- [ ] Badges `Simulado` visíveis nos mocks.
- [ ] CTA e campanha apontam para `https://brandloop-lp.vercel.app`.
- [ ] `.env.example` completo e sem valores reais.
- [ ] Demo ensaiada em até 7 minutos.
- [ ] Deploy na Vercel abre o fluxo (ou corte registrado).
