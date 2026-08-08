# Deck — BrandLoop

`index.html` é o deck de 10 slides do Demo Day. Arquivo único, sem dependência externa,
sem build. Abre em qualquer navegador.

## Como ver

**Local** — clone o repo e abra o arquivo:

```bash
open deck/index.html      # macOS
xdg-open deck/index.html  # Linux
```

⚠️ **O GitHub não renderiza HTML** — clicar no arquivo aqui mostra o código-fonte, não o deck.
Para ver renderizado sem clonar, use um proxy de preview:

- `https://htmlpreview.github.io/?https://github.com/julio-amaral-oliveira/hack2L/blob/main/deck/index.html`
- ou `https://raw.githack.com/julio-amaral-oliveira/hack2L/main/deck/index.html`

Se ligarem GitHub Pages no repo, ele passa a servir em `/deck/` direto — mesma configuração
que serviria a landing page em `/lp/`.

## Como apresentar

| Tecla | Ação |
|---|---|
| `↓` `→` `espaço` `PageDown` | próximo slide |
| `↑` `←` `PageUp` | slide anterior |
| `Home` / `End` | primeiro / último |

Os slides usam scroll-snap: um slide por tela, sem biblioteca de apresentação.
Botão **tema** alterna claro/escuro. Botão **pdf** abre a impressão.

## Como gerar o PDF

Botão **pdf** no canto inferior direito, ou `Cmd+P` / `Ctrl+P` → *Salvar como PDF*.

O CSS de impressão força paleta clara, quebra de página por slide e A4 paisagem.
Nas opções do navegador, **desmarque cabeçalhos e rodapés** e mantenha margens padrão.

## Editar

É HTML puro com CSS embutido — sem framework. Cada slide é uma `<section class="s">`.
Para mudar um número ou uma frase, edite direto e commite.

Os dados do deck vêm de [`demo/ifood/`](../demo/ifood/) — se um número mudar lá,
atualize aqui também. Os dois `search_id` na tela são reais e verificáveis.
