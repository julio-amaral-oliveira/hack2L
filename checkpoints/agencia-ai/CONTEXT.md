# Contexto de domínio — agencia-ai

> Glossário e fronteiras conceituais. Estado e decisões vigentes estão em
> [STATE.md](STATE.md).

## Termos

### Caixa preta

- **Definição:** etapa do pipeline com contrato claro de entrada e saída,
  sem exigir que o orquestrador conheça a implementação interna.
- **Não confundir com:** componente acoplado ao orquestrador.
- **Aliases ou nomes usados no código:** step, etapa.

### Caixa criativo

- **Definição:** caixa que recebe o brand-brief e devolve o criativo
  pronto (roteiro + produção). O interno dela é de outro membro do time e
  está fora do escopo desta sessão.
- **Não confundir com:** o roteiro separado do criativo (dentro da caixa,
  a divisão é do dono dela).

### Orquestrador

- **Definição:** agente que coordena a execução das caixas pretas, passando
  o contrato de saída de uma como entrada da próxima.
- **Não confundir com:** o próprio pipeline ou cada caixa.

### Marca

- **Definição:** cliente ou negócio sobre o qual o pipeline aprende e para
  o qual produz criativos e tráfego.
- **Não confundir com:** produto (o pipeline em si).

## Atores e sistemas

- Usuário: dono da ideia; decide cada decisão de desenho.
- Agente orquestrador: coordena as caixas.
- Caixas pretas: aprendizado, criativo, publicação, tráfego.

## Fronteiras importantes

- O grilling decide o desenho; não decide fornecedores nem código.
