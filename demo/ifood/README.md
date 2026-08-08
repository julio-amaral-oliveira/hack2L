# Pacote de dados da demo — iFood

Este é o "pacote de arquivos que o time entrega" previsto no [PLANO.md](../../PLANO.md) §7.
**Nada aqui é importado pelo app.** O código continua sem nenhum dado de marca, conforme a
decisão travada em [DECISIONS.md](../../DECISIONS.md).

## Como usar na demo

Faça upload destes três arquivos na caixa **Aprender** (`/api/ingest` aceita `.md`):

1. `01-marca.md` — o que a marca é, escala, tom de voz, restrições de comunicação
2. `02-mercado.md` — o diagnóstico de mercado, com URL de evidência em cada crença e objeção
3. `03-concorrencia.md` — inteligência competitiva e ângulo defensivo

Total: ~9 KB, bem abaixo do limite de 200 KB do `ingest`.

Os três alimentam o `BrandDigest`. A entrevista adaptativa fecha o `Diagnosis` já ancorado —
as perguntas do chat viram confirmação e aprofundamento, não descoberta do zero.

## Por que as URLs estão dentro das frases

O contrato `Diagnosis` tipa `crencas` e `objeicoes` como `string[]`: não há campo de fonte.
Para a proveniência sobreviver até a tela, a URL vai **dentro do texto do fato**.

Detalhe que importa: `ingest.ts` capa o `resumo` em 400 caracteres, mas `fatos[]` é livre.
As URLs estão em linhas curtas e factuais justamente para serem extraídas como fatos.

## Sofisticação de mercado

O dado apurado é **estágio 4 de 5** na escala de Schwartz. O contrato aceita
`'baixa' | 'media' | 'alta'`, então mapeia para `alta` — cujo label no `copyPrompt` já exige
"mecanismo novo, prova nova e ângulo novo", que é o comportamento correto.
O texto mantém "estágio 4 de 5" escrito para a informação não se perder.

## Proveniência

| Busca | `search_id` | Resultados | Duração | Créditos |
|---|---|---:|---:|---:|
| Mercado | `4554b5ce-a28d-4d49-abfe-af3fec65ab84` | 719 (33 hot) | 74,9 s | 66 |
| Concorrência | `908fb448-3f62-49f6-8b49-ed8e983ccc9a` | 797 (24 hot) | 83,8 s | 53 |
| **Total** | | **1.516** | **158,7 s** | **119 ≈ US$ 0,89** |

Fontes: Reddit, X, Bluesky, LinkedIn, YouTube. Executado em 08/08/2026 via Gorilla API.

**Isto não é mock.** São duas chamadas reais com `search_id` verificável. Usar como fixture dá
a mesma propriedade de um mock — determinístico, offline, sem risco de API no palco — sem
nenhuma das desvantagens.

## `evidence/`

- `gorilla-mercado-raw.json` / `gorilla-concorrencia-raw.json` — respostas completas
- `gorilla-mercado-evidencia.json` — 66 hot+warm enxutos, prontos para renderizar na UI
- `diagnostico-schwartz.json` / `concorrencia-analise.json` — saída do `custom_schema`
- `reproduzir-*.py` — reproduz as buscas (`GORILLA_API_KEY=grla_... python3 <arquivo>`)

## Armadilhas da Gorilla API

1. `urllib` do Python leva Cloudflare **1010**. Os scripts usam `curl` como transporte.
2. `matched_signals` e `validation_score` voltam **vazios** com query em português.
   O `custom_schema` cobre tudo — não construa lógica em cima desses campos.
3. `tier` não vem no result row. Derive de `result_score`: hot ≥ 0,7 · warm 0,4–0,7.
4. O `custom_schema` exige `required` com **todas** as chaves e `additionalProperties: false`.

## Limites desta campanha

- Não citar concorrente pelo nome no criativo.
- Não exibir percentual de taxa no criativo.
- Não prometer venda, margem ou qualquer número.
- Nenhuma referência a processo regulatório.
- Exercício de hackathon — não é peça oficial aprovada pela marca.
