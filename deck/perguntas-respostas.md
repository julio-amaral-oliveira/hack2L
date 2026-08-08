# Perguntas e respostas — treino do pitch falado

> Escrito para o deck de 7 slides. Banca de VC early-stage: depois dos 3 minutos
> sobram 2 a 4 perguntas, e é nelas que a nota se decide.
>
> **Regra de ouro: nenhuma resposta passa de 20 segundos.** Resposta longa lê como
> insegurança. Primeira frase responde. Segunda prova. Terceira, se houver, é ponte.
>
> **Quem responde é quem construiu.** Ninguém responde pela parte do outro — a banca percebe.

---

## ⚠️ Três coisas para não errar ao falar

1. **`US$ 0,89` são oitenta e nove centavos de dólar.** Não "zero vírgula oitenta e
   nove centavos". O número é bom demais para ser dito errado.
2. **A ordem: entrevista ANTES da pesquisa de mercado.** Se inverter na fala, alguém
   pergunta e a resposta 4 fica sem chão.
3. **"Estágio 4 de sofisticação"** — diga uma vez, com naturalidade. É a frase que
   nenhum outro time vai dizer hoje.

---

## A · A tese

**1. Por que abrir falando que a IA fez tudo ficar igual? Não é ruim para quem vende IA?**
> É o contrário: é o que separa a gente de quem só gera criativo. Produzir virou
> commodity — qualquer pessoa gera uma peça em segundos. O que ficou raro é o anúncio
> que só poderia ser daquela marca. A gente vende a parte rara.

**2. Isso não é um problema de gosto? Onde está a dor real?**
> A dor é de atenção e de dinheiro. Anúncio que parece de todo mundo compete só no
> lance, nunca no reconhecimento. E o dono continua trocando fornecedor todo trimestre
> procurando alguém que entenda a marca dele — o que é caro em dinheiro e em tempo.

**3. Vocês são uma ferramenta ou uma agência?**
> Nem uma nem outra. Ferramenta espera briefing; agência cobra hora. A gente é um
> agente que faz o trabalho inteiro e melhora a cada campanha que roda.

---

## B · O produto e a IA *(o critério do hackathon)*

**4. O que exatamente o agente faz sozinho, e em que ordem?**
> A ordem importa. A empresa sobe o contexto que quiser. O agente entrevista as
> lideranças para entender a dor que ela acha que resolve. **Só então** vai ao mercado
> verificar como ela está sendo comentada sobre aquele assunto. Aí fecha o diagnóstico,
> escreve o roteiro, produz o criativo, sobe no anúncio e lê o funil até a venda.

**5. Por que a pesquisa de mercado vem depois da entrevista, e não antes?**
> Porque sem saber o que procurar, pesquisa de mercado vira ruído. A entrevista dá a
> hipótese — qual dor a empresa acha que resolve. A pesquisa testa essa hipótese contra
> o que as pessoas estão realmente dizendo. Inverter seria pedir para o agente adivinhar
> o assunto.

**6. Onde a IA realmente trabalha? Não é só chamar um modelo seis vezes?**
> Cada caixa usa uma técnica diferente. A ingestão extrai fatos **sob schema**, então não
> pode inventar o que não está no texto. A entrevista **decide sozinha** a próxima
> pergunta olhando quais campos ainda estão vazios. A pesquisa devolve o diagnóstico já
> preenchido, **ancorado em post real**, com URL em cada campo. E a copy escreve com a
> rubrica de Schwartz como **restrição tipada**: sem prova no diagnóstico, ela reformula
> em vez de inventar.

**7. Isso não é só um wrapper de LLM?**
> Um wrapper recebe briefing e devolve texto. O nosso começa entendendo a marca por
> dentro e depois vai conferir lá fora se é isso mesmo. Leu mais de mil e quinhentas
> conversas reais em cinco plataformas antes de escrever uma linha.

**8. E se o agente escrever uma bobagem e queimar a marca?**
> Ele opera dentro de um envelope: claims proibidos, teto de verba, temas vetados. E a
> regra mais dura é a de prova — ele não pode afirmar número, resultado ou depoimento
> que não esteja no material da marca. Sem prova, reformula a frase.

**9. O que acontece quando o funil vaza?**
> Ele age no ponto certo. Ninguém para no vídeo, ele reescreve o gancho. Assiste e não
> clica, ele troca a promessa. Entra na página e sai na hora, ele testa outra. Chega na
> oferta e não fecha, ele reposiciona. Não é otimizar lance — é consertar a peça que falhou.

---

## C · O que é real

> Não há slide para isso — é respondido falado. O corte está aqui embaixo;
> quem responder precisa saber de cor qual caixa é real e qual é simulada.

**10. O que é real e o que é simulado nessa demo?**
> Real: contexto, entrevista, análise de mercado, roteiro e criativo. Simulado:
> publicação, campanha e performance. E somos explícitos — o próprio contrato de tipos
> marca `simulado: true`, não dá para esconder nem sem querer.

**11. Então a performance é inventada?**
> Simulada, e declarada. ROAS de oito semanas não cabe em cinco horas. O que construímos
> foi o ambiente de avaliação — o mesmo harness que usaríamos para rodar evals do agente
> em produção.

**12. E se a API cair no meio da demo?**
> Não cai a demo. Todas as sete caixas têm rede de segurança: se a busca ao vivo falhar,
> ela cai na análise gravada e avisa na tela. A gente preferiu que a apresentação
> continuasse e ficasse óbvio que continuou pelo caminho alternativo.

**13. O loop de aprendizado já funciona ou é roadmap?**
> Hoje é roadmap, e vou ser direto sobre isso. A esteira até o anúncio roda; a escrita de
> volta no histórico da marca é a próxima entrega. É onde mora o valor de longo prazo, e
> é a primeira coisa depois do hackathon.

**14. Vocês usaram os patrocinadores?**
> Gorilla, sim, de verdade — duas execuções, oitenta e nove centavos de dólar, e o
> `search_id` é verificável. ElevenLabs entra na camada de voz e áudio do criativo.
> Featherless está no roadmap para o passo barato de alto volume.

---

## D · Números e dinheiro

**15. Oitenta e nove centavos? Como assim?**
> Duas pesquisas de mercado completas, mil e quinhentas conversas em cinco plataformas,
> em menos tempo do que durou este pitch. É o custo medido de rodar, não uma estimativa
> de plano.

**16. Qual a margem por cliente?**
> O custo de execução é medido: centavos por análise. O preço ainda é decisão nossa, não
> validada com cliente — então prefiro não inventar uma margem. O que dá para afirmar é a
> forma: custo marginal por unidade é chamada de API, e não cresce com o tamanho da rede.

**17. CAC e LTV?**
> Não temos dado próprio, e não vou fingir que temos. A estrutura é o que dá para dizer:
> um contrato de rede com N unidades dilui a aquisição por N. O número real só existe
> depois do primeiro piloto.

**18. Quanto vocês cobram?**
> Assinatura por unidade por mês, contratada pela rede. O ponto do modelo é que a venda é
> uma só e o uso é por unidade — é o que resolve o custo de aquisição que quebra todo
> mundo que tenta vender software para PME.
> ⚠️ **Definir o valor antes do pitch.** Um número concreto vale mais que a estrutura.

---

## E · Mercado

**19. Quem paga por isso?**
> Rede e franquia de varejo local — food-service como porta de entrada. Não o restaurante
> solo: ele não tem verba e o custo de vendê-lo mata a operação. O franqueador tem
> orçamento, tem decisão e tem a dor de que marketing local por unidade não escala.

**20. Qual o tamanho disso?**
> Só o iFood tem 500 mil estabelecimentos parceiros em 1.500 cidades. É o piso do mercado
> endereçável, não o teto — a mesma dor existe em farmácia, academia, clínica e pet.

**21. Como o cliente resolve isso hoje, sem vocês?**
> De duas formas. Ou contrata quatro fornecedores — pesquisa, redator, produtora, gestor
> de tráfego. Ou compra uma planilha no YouTube. E isso não é ironia: os resultados mais
> relevantes da nossa busca são criadores vendendo planilha de precificação.

**22. Por que agora?**
> Três coisas mudaram. Modelo que segue rubrica estruturada sem sair do trilho. API que lê
> conversa social em tempo real por centavos. E geração de vídeo em qualidade de anúncio.
> Há dois anos, qualquer uma das três derrubava o produto.

---

## F · Defensibilidade e time

**23. O que impede alguém de copiar em três meses?**
> O prompt, copiam numa tarde. O que não copiam é o histórico: o que converteu, para qual
> público, com qual mecanismo, acumulado campanha após campanha. Quanto mais tempo a marca
> roda com a gente, mais caro fica sair.

**24. E se a Meta ou o Google mudar a API?**
> Já está isolado. Publicação e campanha são adapters atrás de um contrato — trocar
> plataforma é trocar uma implementação, não reescrever o agente. Fizemos o mesmo com LLM
> e com vídeo: dois provedores em cada camada.

**25. Qual a diferença para AdCreative, Arcads, Creatify?**
> Todos começam no briefing e param no criativo. A gente começa no mercado e vai até a
> venda. E achamos um concorrente direto **dentro do nosso próprio dado**: alguém já vende
> um agente de IA de precificação pro mesmo público. Isso não assusta, valida.

**26. Quem é o time?**
> Quatro pessoas. Um no agente e nos contratos, dois em infraestrutura e integração de
> anúncio, um em pesquisa de mercado e go-to-market. Todos construíram hoje.

**27. Qual o próximo passo se vocês ganharem?**
> Fechar o loop de performance e colocar três unidades de uma rede rodando de verdade, com
> verba real. Não precisamos de mais tecnologia para isso — precisamos de um cliente e de
> trinta dias.

---

## G · As que machucam

**28. Vocês não têm nenhum cliente. Como sabem que alguém paga?**
> Não sabemos, e não vou fingir que sabemos. O que temos é evidência de que o problema é
> caro: existe um mercado inteiro de criadores vendendo planilha para essa dor, e um
> concorrente já vendendo agente de IA pro mesmo público. Alguém já está pagando por uma
> versão pior disso.

**29. Por que o iFood usaria isso?**
> Não usaria — o iFood é o benchmark, não o cliente. Escolhemos ele porque é o problema de
> marketing mais difícil do Brasil neste momento, e porque vocês conseguem julgar em dois
> segundos se o criativo saiu certo.

**30. Isso é um produto ou uma feature de uma plataforma de ads?**
> Hoje as plataformas otimizam entrega, não criação. Elas não sabem quem é o prospect da
> marca nem por que ele não compra. A camada de diagnóstico é o que falta — e ela é
> agnóstica de plataforma por construção.

**31. Em 5 horas dá para confiar em alguma coisa disso?**
> Confiem no que tem recibo. O `search_id` é verificável agora. O resto está marcado como
> simulado na própria tela. Preferimos mostrar um corte honesto a uma demo bonita que não
> sobrevive a uma pergunta.

**32. Não é arriscado usar uma marca real sem autorização?**
> É exercício de hackathon, e a gente fala isso. Não usamos assinatura oficial, não citamos
> concorrente pelo nome, não exibimos percentual de taxa e não prometemos resultado.
> O criativo é uma proposta, não uma peça aprovada.

---

## Ensaio

1. **Cronometre.** Se passar de 3:00, o corte é o slide 6 (negócio) — ele cabe em duas
   frases. Nunca corte o slide 2 nem o 5: são os que vendem.
2. **Decore quatro coisas, não o texto todo:** a frase de abertura, os seis agentes,
   **US$ 0,89**, e **estágio 4 de sofisticação**.
3. **Ensaie em voz alta as respostas 10, 12 e 13.** São as três em que vocês assumem um
   limite — e é aí que a banca decide se confia. Dita com firmeza, "hoje é roadmap" soa
   como domínio do escopo; dita hesitando, soa como buraco.
4. **Deixe o slide de backup a um clique.** Ele existe para a pergunta 10 e não deve
   aparecer antes disso.
