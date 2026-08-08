# Perguntas e respostas — treino do pitch falado

> Banca de VC early-stage. Depois de 3 minutos, sobram 2 a 4 perguntas.
> **Regra de ouro: nenhuma resposta passa de 20 segundos.** Resposta longa lê como insegurança.
> Primeira frase responde. Segunda frase prova. Terceira, se houver, é ponte para o próximo tema.

---

## A. O produto

**1. Isso não é só um wrapper de LLM?**
> Um wrapper recebe briefing e devolve texto. O nosso começa entendendo a marca por dentro e
> só depois vai conferir lá fora se é isso mesmo — leu mais de mil e quinhentas conversas reais
> em cinco plataformas antes de escrever uma linha. O briefing é a marca falando de si mesma;
> a gente ouve os dois lados.

**2. O que exatamente o agente faz sozinho, e em que ordem?**
> A ordem importa. Primeiro a empresa sobe o contexto macro que quiser. Depois ele entrevista
> as lideranças para entender a dor que ela acha que resolve. **Só então** vai ao mercado
> verificar como ela está sendo comentada sobre aquele assunto. Aí fecha o diagnóstico,
> escreve o roteiro, produz o criativo, sobe no anúncio e lê o funil até a venda.
> Nenhuma etapa espera humano para começar a próxima.

**3. Por que a pesquisa de mercado vem depois da entrevista, e não antes?**
> Porque sem saber o que procurar, pesquisa de mercado vira ruído. A entrevista dá a hipótese —
> qual dor a empresa acha que resolve. A pesquisa testa essa hipótese contra o que as pessoas
> estão realmente dizendo. Inverter a ordem seria pedir para o agente adivinhar o assunto.

**3b. E por que entrevistar quem vende?**
> Porque o material institucional diz o que a empresa gostaria de ser. Quem vende sabe qual
> objeção mata o negócio na terça-feira. São até oito perguntas, uma por vez, cada uma mirando
> só o campo que ainda falta.

**3c. Como o agente chegou naquele criativo do iFood?**
> Ele leu a dor antes de escrever: hora perdida na planilha e taxa que só aparece depois. Por
> isso o criativo não promete venda — promete transparência na taxa e uma operação que o dono
> toca sem virar a noite fazendo conta. É o ângulo que o dado pedia, não o que soaria bonito.

**4. E se o agente escrever uma bobagem e queimar a marca?**
> Ele opera dentro de um envelope: claims proibidos, teto de verba, temas vetados. E a regra
> mais dura é a de prova — ele não pode afirmar número, resultado ou depoimento que não esteja
> no material da marca. Se não tem prova, ele reformula a frase em vez de inventar.

**5. Qual a diferença para AdCreative, Arcads, Creatify?**
> Todos eles começam no briefing e param no criativo. A gente começa no mercado e vai até a
> venda. E tem um detalhe: nós achamos um concorrente direto dentro do nosso próprio dado —
> um cara vendendo agente de IA de precificação pro mesmo público. Isso não nos assusta,
> valida a demanda.

---

## B. O que é real

**6. O que é real e o que é simulado nessa demo?** *(abra o slide 10)*
> Real: a pesquisa de mercado, o contexto da empresa, a entrevista, o diagnóstico, o roteiro
> e o criativo. Simulado: a publicação, a campanha e a performance. E somos explícitos —
> o próprio contrato de tipos marca `simulado: true`, não dá para esconder nem sem querer.

**7. Então a performance é inventada?**
> Não inventada: simulada, e declarada. ROAS de oito semanas não cabe em cinco horas de
> hackathon. O que construímos foi o ambiente de avaliação — o mesmo harness que usaríamos
> para rodar evals do agente em produção. A diferença entre esconder e escolher é o que
> estamos mostrando aqui.

**8. O loop de aprendizado já funciona ou é roadmap?**
> Hoje é roadmap, e vou ser direto sobre isso. A esteira até o anúncio roda; a escrita de
> volta no histórico da marca é a próxima entrega. É onde está o valor de longo prazo,
> e é por isso que é a primeira coisa depois do hackathon.

**9. Vocês usaram os patrocinadores?**
> Gorilla, sim, de verdade — duas execuções, 119 créditos, 89 centavos de dólar, e os dois
> `search_id` estão no slide. ElevenLabs entra na camada de voz e áudio do criativo.
> Featherless está no roadmap para o passo barato de alto volume.

---

## C. Mercado e negócio

**10. Quem paga por isso?**
> Rede e franquia de varejo local — food-service como porta de entrada. Não o restaurante
> solo: ele não tem verba e o custo de vendê-lo mata a operação. O franqueador tem orçamento,
> tem decisão e tem a dor de que marketing local por unidade não escala.

**11. Qual o tamanho disso?**
> Só o iFood tem 500 mil estabelecimentos parceiros em 1.500 cidades. Esse é o piso do
> mercado endereçável, não o teto — a mesma dor existe em farmácia, academia, clínica e pet.

**12. Como o cliente resolve isso hoje, sem vocês?**
> De duas formas. Ou contrata quatro fornecedores — pesquisa, redator, produtora, gestor de
> tráfego. Ou compra uma planilha no YouTube. E isso não é ironia: os resultados mais
> relevantes da nossa busca são todos criadores vendendo planilha de precificação.

**13. Quanto vocês cobram?**
> Assinatura por unidade por mês, contratada pela rede. O ponto do modelo é que a venda é
> uma só e o uso é por unidade — é o que resolve o custo de aquisição que quebra todo mundo
> que tenta vender software para PME.
> ⚠️ **Definir o número antes do pitch.** Um valor concreto vale mais que a estrutura.

**14. CAC e LTV?**
> Ainda não temos dado próprio — seria invenção afirmar número. O que dá para dizer é a
> estrutura: um contrato de rede com N unidades dilui o CAC por N, e o custo marginal de
> rodar mais uma unidade é a chamada de API, que medimos: centavos por diagnóstico.

**15. Por que agora?**
> Três coisas mudaram. Modelo que segue rubrica estruturada sem sair do trilho. API que lê
> conversa social em tempo real por centavos. E geração de vídeo que chegou em qualidade de
> anúncio. Há dois anos, qualquer uma das três derrubava o produto.

---

## D. Defensibilidade e time

**16. O que impede alguém de copiar em três meses?**
> O prompt, copiam numa tarde. O que não copiam é o histórico: o que converteu, para qual
> público, com qual mecanismo, acumulado campanha após campanha. Quanto mais tempo a marca
> roda com a gente, mais caro fica sair.

**17. E se a Meta ou o Google mudar a API?**
> Já está isolado. Publicação e campanha são adapters atrás de um contrato — trocar
> plataforma é trocar uma implementação, não reescrever o agente. Fizemos o mesmo com LLM
> e com vídeo: hoje rodamos com dois provedores em cada camada.

**18. Quem é o time?**
> Quatro pessoas. Um no agente e nos contratos, dois em infraestrutura e integração de
> anúncio, um em pesquisa de mercado e go-to-market. Todos construíram hoje.

**19. Qual o próximo passo se vocês ganharem?**
> Fechar o loop de performance e colocar três unidades de uma rede rodando de verdade,
> com verba real. Não precisamos de mais tecnologia para isso — precisamos de um cliente
> e de trinta dias.

---

## E. As que machucam

**20. Vocês não têm nenhum cliente. Como sabem que alguém paga?**
> Não sabemos, e não vou fingir que sabemos. O que temos é evidência de que o problema é
> caro: existe um mercado inteiro de criadores vendendo planilha para essa dor, e um
> concorrente já vendendo agente de IA pro mesmo público. Alguém já está pagando por uma
> versão pior disso.

**21. Por que o iFood usaria isso?**
> Não usaria — o iFood é o benchmark, não o cliente. Escolhemos ele porque é o problema de
> marketing mais difícil do Brasil neste momento, e porque vocês conseguem julgar em dois
> segundos se o criativo saiu certo. Cliente é quem tem a mesma dor sem ter time de marketing.

**22. Isso é um produto ou uma feature de uma plataforma de ads?**
> Hoje as plataformas otimizam entrega, não criação. Elas não sabem quem é o prospect da
> marca nem por que ele não compra. A camada de diagnóstico é o que falta — e ela é
> agnóstica de plataforma por construção.

**23. Em 5 horas dá para confiar em alguma coisa disso?**
> Confiem no que tem recibo. Os `search_id` são verificáveis agora. O resto está marcado
> como simulado na própria tela. Preferimos mostrar um corte honesto a uma demo bonita
> que não sobrevive a uma pergunta.

---

## Ensaio

1. Cronometre. Se passar de 3:00, o corte é o slide 08 — o loop cabe em uma frase no fecho.
2. Decore três coisas, não o texto todo: a frase do briefing, o número (**US$ 0,89 e menos
   tempo que o pitch**) e a expressão **estágio 4 de sofisticação**.
3. Ensaiem a resposta 6 e a 8 em voz alta. São as duas que decidem se a banca confia em vocês.
4. Quem responde: o dono de cada resposta é quem construiu aquela parte. Ninguém responde
   por outro — a banca percebe.
