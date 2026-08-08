# Caixa "Pesquisa de mercado" — integração com a Gorilla

Esta pasta entrega a etapa que faltava no pipeline: **depois** da entrevista com
as lideranças, o agente vai ao mercado verificar se a dor que a empresa acha que
resolve é a dor que as pessoas realmente estão falando.

> **Nada em `lib/contracts.ts` foi alterado.** O que precisa entrar lá está na
> seção "O que falta no contrato", no fim deste arquivo — a decisão é do dono
> do contrato, não desta branch.

## Arquivos

| Arquivo | Papel |
|---|---|
| `lib/gorilla/types.ts` | Tipos da API e do `MarketSignal` normalizado |
| `lib/gorilla/schema.ts` | Os JSON Schemas que a Gorilla preenche + `montarQuery` |
| `lib/gorilla/client.ts` | Cliente: `startSearch`, `readSearch`, `search`, `billingStatus` |
| `lib/boxes/market.ts` | A caixa, no mesmo formato de `lib/boxes/ingest.ts` |
| `app/api/market/route.ts` | `POST` abre a busca · `GET ?id=` faz o polling |

## Como usar

```bash
# .env.local
GORILLA_API_KEY=grla_...
```

```ts
// abre
const { searchId, startedAt } = await fetch('/api/market', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dores: [
      'taxa do iFood come minha margem restaurante',
      'sair do iFood dono de restaurante',
      'comissao insustentavel pequeno restaurante',
    ],
  }),
}).then((r) => r.json())

// faz polling — gratuito, não gasta crédito
const signal = await fetch(`/api/market?id=${searchId}&startedAt=${startedAt}`)
  .then((r) => r.json())
// signal.status === 'completed' → signal.posts, signal.data, signal.communities
```

**Sem `GORILLA_API_KEY` a caixa cai no fixture** de
`demo/ifood/evidence/gorilla-mercado-raw.json` — uma execução real gravada, com
`search_id` verificável. Mesmo padrão do `localFallback` em `lib/boxes/ingest.ts`.
Isso dá determinismo na demo sem inventar dado.

## O pulo do gato: `custom_schema`

A Gorilla aceita um JSON Schema junto da busca e devolve o campo `data`
**preenchido e ancorado nos posts reais, sem custo extra de créditos**.

Ou seja: não é "buscar links e pedir para um LLM resumir". É extração
estruturada sob restrição, com URL de evidência em cada campo. É o que separa
uma conclusão com fonte de um palpite do modelo.

`DIAGNOSTICO_SCHEMA` em `schema.ts` é o diagnóstico da rubrica de Schwartz —
os mesmos oito campos de `Diagnosis`, com duas diferenças propositais
explicadas abaixo.

## Cinco armadilhas, todas descobertas rodando de verdade

1. **Cloudflare 1010.** Clientes sem User-Agent de browser levam 403. O
   `client.ts` manda um UA explícito. Se reescrever em outra linguagem, mande também.
2. **`matched_signals` e `validation_score` voltam vazios** com query em
   português — nos 719 resultados da execução real, todos vazios. Não construa
   lógica em cima deles; o `custom_schema` cobre tudo.
3. **`tier` não vem no result row.** Derive de `result_score` — é o que
   `tierOf()` faz: hot ≥ 0,7 · warm 0,4–0,7 · cold < 0,4.
4. **Modo strict exige `required` com TODAS as chaves e
   `additionalProperties: false`** em todo objeto aninhado. Os helpers
   `strict()` e `arrayOf()` em `schema.ts` garantem isso.
5. **A busca leva 75s a 85s.** Estoura o `maxDuration` de 60s da Vercel — por
   isso a rota é em duas fases. Não tente fazer numa chamada só.

## A regra de query que mais importa

**Busque a dor em primeira pessoa, não o nome da marca.**

`"taxa come minha margem"` trouxe 33 resultados hot de gente real.
`"iFood"` traria release e notícia. A query multi-termo separada por `;` roda
sub-queries em paralelo e devolve lista deduplicada — use 3 a 5 formulações
diferentes da mesma dor.

## Custos

Plano free tem 600 créditos. Em modo `ranked`: 1 crédito por lead hot ou warm,
cold é grátis, busca que falha é reembolsada.

Duas execuções reais: **1.516 resultados, 119 créditos, US$ 0,89, 158,7s.**
`search_id` `4554b5ce-a28d-4d49-abfe-af3fec65ab84` e
`908fb448-3f62-49f6-8b49-ed8e983ccc9a`.

## O que falta no contrato

Para o `MarketSignal` alimentar o `Diagnosis`, duas mudanças em
`lib/contracts.ts` — **nenhuma feita aqui**:

**1. Proveniência.** Hoje `crencas` e `objecoes` são `string[]`: não há onde
guardar a fonte, e a URL de evidência se perde antes de chegar na tela.

```ts
// hoje
crencas: string[]
// proposta
crencas: { texto: string; evidenciaUrl?: string }[]
```

Mexe em `contracts.ts`, no zod e no tool schema de `interviewPrompt.ts`, e em
`DiagnosisGrid.tsx`. Enquanto não mudar, o pacote da demo contorna colocando a
URL dentro do próprio texto do fato.

**2. Escala de sofisticação.** Hoje é `'baixa' | 'media' | 'alta'`; a escala de
Schwartz é 1 a 5, e o dado apurado foi **estágio 4**. `'alta'` funciona — o
label no `copyPrompt` já exige mecanismo novo — mas perde granularidade.

**3. Um `StepId` novo.** Se a pesquisa virar etapa visível no `Stepper`,
`StepId` precisa de `'mercado'`, e `PipelineState` de `marketSignal`.

## Reproduzir fora do app

`demo/ifood/evidence/reproduzir-mercado.py` e `reproduzir-concorrencia.py`
rodam as duas buscas em Python puro, sem depender do Next:

```bash
GORILLA_API_KEY=grla_... python3 demo/ifood/evidence/reproduzir-mercado.py
```
