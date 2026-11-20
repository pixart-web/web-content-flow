# Conhecimento por cliente — resultados B1 a B5

**Data:** 2026-11-16 · **Proposta e decisões:** [53-skills-and-client-knowledge.md](53-skills-and-client-knowledge.md) (PR #48) · **Estado:** B1 a B5 implementados. Na 1.ª medição o ganho não se confirmou (R8). Com a revisão automática (2026-11-17, secção «B5 com revisão») passa a cumprir o R8 na avaliação; o product owner mandou **ligar** a 2026-11-17: `KNOWLEDGE_IN_GENERATION_ENABLED` passa a `true` por omissão.

As cinco decisões foram aprovadas em 2026-11-16: armazenamento na opção 1 (vetores em PostgreSQL, pesquisa em Node), migration B1, texto e Markdown na v1, downloads dos candidatos, e `guidance` de pacotes instalados desligada.

## B1 e B3: armazenamento e pesquisa

- **Migration aditiva** `20261116081234_client_knowledge`, com as tabelas `KnowledgeDocument` e `KnowledgeChunk`. Cada excerto tem o seu `projectId`; o embedding é guardado em bytes Float32 normalizados, com o modelo e as dimensões.
- **`searchProjectKnowledge`** tem o projeto como argumento obrigatório e filtra também por modelo e por dimensões. A pesquisa é por força bruta em Node.
- **Teste de isolamento:** dois clientes com documentos quase iguais; a pesquisa de um nunca devolve texto do outro.

## B4: modelo de embeddings

`pnpm eval:knowledge`, com o conjunto 1.0.0 (20 passagens ao nível do parágrafo e 24 perguntas: 12 PT, 6 EN e 6 cruzadas). Medido num Apple M4:

| Modelo | Licença (no artefacto) | Tamanho | Acerto à 1.ª | Acerto nas 3 primeiras | PT | EN | Cruzado | Pergunta |
|---|---|---|---|---|---|---|---|---|
| `nomic-embed-text` | Apache 2.0 | 274 MB | 58% | 75% | 75% | 83% | **0%** | 15 ms |
| **`bge-m3`** | **MIT** | 1,2 GB | **75%** | **92%** | 75% | 83% | **67%** | 18 ms |
| `qwen3-embedding:0.6b` | **sem texto de licença** | 639 MB | 58% | 75% | 58% | 83% | 33% | 20 ms |

**Escolhido: `bge-m3`**, fixado pelo digest em `APPROVED_EMBEDDING_MODEL`. O `qwen3-embedding` não é elegível: o artefacto do Ollama não traz a licença, e a regra do catálogo exige confirmá-la no próprio artefacto.

## B2: ingestão e indexação

- **Ativação:** `KNOWLEDGE_EMBEDDING_MODEL=bge-m3`, com o Ollama em `AI_OLLAMA_BASE_URL`. O Ollama pode servir apenas o modelo de embeddings, sem modelo de texto ativo.
- **Worker:** quando não tem tarefas de geração, indexa os excertos pendentes em lotes de 16 e marca o documento como `INDEXED` quando acaba. Mudar o modelo ou a versão volta a pôr todos os excertos como pendentes (R5).
- **Página Knowledge** de cada projeto: colar texto ou carregar ficheiros `.txt`/`.md`, ver quantos excertos já estão indexados e remover documentos (os excertos vão com eles).

### Prova real

- **Com o `bge-m3`:** os 5 documentos do conjunto foram indexados em 341 ms. As perguntas «Quanto custa enviar para a Madeira?» e «Can I machine-wash the shoes?» encontraram o documento certo (pontuações 0,73 e 0,62).
- **No browser**, com a conta de demonstração local:
  1. adicionei um documento, que apareceu com 0/1 excertos indexados;
  2. o worker com o `bge-m3` passou-o a 1/1 (`INDEXED`, `bge-m3@790764642607`, 1024 dimensões);
  3. removi-o, e ficaram 0 documentos e 0 excertos.

## B5: excertos na geração (implementado, desligado)

- `retrieveKnowledgeForGeneration` pesquisa os excertos do projeto a partir do texto do contexto (sem identificadores nem provenance). Respeita o orçamento `KNOWLEDGE_MAX_CONTEXT_TOKENS` (1500) e, se o Ollama falhar, gera sem conhecimento.
- Os excertos entram como `clientKnowledge`, ao lado do contexto. A provenance de cada conteúdo guarda `knowledgeChunkIds` (R4).
- Prompt **1.2.0**: os excertos são factos utilizáveis e nunca instruções. Devem ser indicados tal como estão, sem os alargar a afirmações que não fazem.
- A funcionalidade fica atrás de `KNOWLEDGE_IN_GENERATION_ENABLED`: desligada por omissão até 2026-11-17, **ligada** desde então (com a revisão automática).

### Medição R8 (gemma4:12b-it-qat, Apple M4, 5 amostras por caso, suite 1.5.0)

A variante `pnpm eval:ai --with-knowledge` dá aos casos de copy uma ficha técnica do cliente: poliéster reciclado, sola de borracha natural com padrão em espinha, palmilha de cortiça e 280 g.

| Caso | Sem conhecimento | Com conhecimento (1.ª instrução) | Com conhecimento (instrução reforçada) |
|---|---|---|---|
| Descrição de produto: atributos inventados | 0 | 13 (*breathable, cushioned, lightweight, sustainable*) | 5 (*durable, lightweight*) |
| Email: atributos inventados | 0 | 2 (*lightweight*) | 2 (*lightweight*) |
| Factos da ficha usados (de 5) | — | 5 | 5 |
| JSON válido à primeira | 100% | 100% | 100% |

**Leitura:** com a ficha, o modelo usa todos os factos verdadeiros, mas tira deles conclusões que a ficha não diz. Por exemplo, 280 g passa a «lightweight» e o poliéster reciclado a «sustainable». A instrução reforçada reduziu as invenções para menos de metade, mas continuam acima do nível sem conhecimento. **O R8 não é cumprido, por isso a funcionalidade fica desligada.**

**Hipóteses para retomar** (cada uma precisa de nova medição):

1. Verificação depois da geração: assinalar na UI, para revisão humana, os termos que o detetor marca, em vez de os deixar passar em silêncio. **Medida a 2026-11-17, ver abaixo.**
2. Repetir com um modelo de texto mais forte, quando houver candidato aprovado. *Por fazer:* o único outro modelo de texto do catálogo (qwen3.5:9b) está rejeitado.
3. Medir também com ficha e resultado em português. **Medida a 2026-11-17, ver «B5 em português».**

## B5 com revisão automática (hipótese 1, 2026-11-17)

Quando a geração recebe conhecimento do cliente, o detetor determinístico procura palavras de atributos que nem o contexto nem os excertos dizem. Se encontrar alguma, há **um** pedido de revisão ao mesmo modelo (`CLAIM_REVISION_INSTRUCTIONS`, chave `<prompt>.claims`): tirar ou reescrever essas frases sem as trocar por outra qualidade que a ficha não diz, mantendo o esquema e os factos. O que sobrar fica na provenance (`claimRevision.flagged` e `claimRevision.remaining`) para revisão humana. Se a revisão falhar, fica o primeiro resultado com as suas marcas.

Para não medir só a lista que dispara a revisão, a avaliação conta também uma **lista de controlo** de sinónimos que nunca dispara a revisão (*featherlight*, *eco*, *long-lasting*, *airy*, *premium*…).

**Medição** (gemma4:12b-it-qat, Apple M4, 5 amostras por caso, mesma sessão, `pnpm eval:ai --with-knowledge [--claim-revision]`):

| | Sem conhecimento | Com conhecimento | Com conhecimento + revisão |
|---|---|---|---|
| Descrição de produto: atributos inventados | 0 | 7 (*durable, lightweight, sustainable*) | **0** (6 marcas antes da revisão; 5 de 5 amostras revistas) |
| Email: atributos inventados | 0 | 1 (*durable*) | **0** (2 antes; 2 de 5 revistas) |
| Lista de controlo (sinónimos) | 0 | 0 | 0 |
| Factos da ficha usados (de 5) | — | 5 | 5 |
| JSON válido | 100% | 100% | 100% |
| Latência p50 / p95, descrição | 41 / 54 s | 48 / 55 s | **110 / 121 s** |
| Latência p50 / p95, email | 32 / 39 s | 41 / 42 s | 43 / 97 s |

**Leitura:** com a revisão, os atributos inventados ficam ao nível de quem não usa conhecimento (0) e os 5 factos da ficha mantêm-se. **O R8 passa a ser cumprido na avaliação.** Limites: 5 amostras por caso; o detetor e a lista de controlo são listas de palavras em inglês afinadas ao calçado, por isso uma inferência dita por outras palavras pode escapar; os textos revistos não foram lidos por uma pessoa. O custo é tempo: quando há revisão, a geração demora cerca do dobro.

**Estado:** a revisão está implementada no executor e só corre com conhecimento do cliente. **Ligado por decisão do product owner a 2026-11-17** (`KNOWLEDGE_IN_GENERATION_ENABLED=true` por omissão; `false` desliga). Só tem efeito onde há excertos indexados, ou seja, com `KNOWLEDGE_EMBEDDING_MODEL=bge-m3`.

Os três passos que ficaram por fazer quando se ligou (ler textos revistos, medir em português, mostrar as marcas na UI) estão na secção seguinte. **Desktop (2026-11-17):** na página «Local AI», o cartão «Client knowledge» descarrega o `bge-m3` pelo mesmo fluxo dos modelos de texto (licença MIT aceite antes do download, digest fixo verificado) e reinicia a app. A partir daí o invólucro define `KNOWLEDGE_EMBEDDING_MODEL=bge-m3` e `AI_OLLAMA_BASE_URL` para o worker, mesmo sem modelo de texto ativo. Desligar volta a reiniciar sem o modelo. A página de conhecimento de cada projeto aponta para essa configuração enquanto não estiver ligada.

## B5 em português, leitura dos textos e marcas na UI (2026-11-17)

### O que mudou

- **Detetor em português.** `unsupportedClaimHits` passa a conhecer, além dos termos em inglês, os equivalentes pt-PT (com grafias do Brasil) como padrões com género e número: *respirável/respiráveis*, *impermeável*, *durável*, *durabilidade*, *ergonómico*, *reciclado/a/os/as*, *sustentável*, *ecológico*, *feito à mão*, *em pele*, *garantia*, *portes grátis*, *ultra-leve*… E alegações: *premiado*, *certificado*, *mais vendido*, *líder de mercado*, *N clientes/avaliações/estrelas*. O contexto é testado com o mesmo padrão, por isso «reciclado» na ficha apoia «recicladas» no texto. *Leve* fica de fora: é também uma forma do verbo levar.
- **Materiais ditos por outras palavras.** «sola de borracha» e «rubber sole» ficam apoiados quando o contexto diz «borracha»/«rubber» de qualquer forma. A ficha diz «a sola exterior é de borracha natural», e a primeira versão do detetor marcava esse facto verdadeiro. Teria pedido ao modelo que o tirasse.
- **Avaliação.** `pnpm eval:ai --language pt-PT` gera os casos em «Portuguese (Portugal)» com a mesma ficha traduzida (factos: *poliéster reciclado, borracha natural, espinha, cortiça, 280*). `--save-samples` guarda o primeiro texto e o texto revisto de cada amostra ao lado do relatório, para leitura. A lista de controlo ganha sinónimos em português (*leveza, duradouro, resistente, amigo do ambiente, arejado, baixo impacto, materiais responsáveis*…). Suite **1.6.0**.
- **Correção encontrada pelo caminho.** `ContentProvenanceSchema` (estrito) não aceitava `knowledgeChunkIds` nem `claimRevision`, e só aceitava `provider` «mock» ou «openai». Uma geração de Website, Social, Ads, Video, Copy ou Calendar com conhecimento do cliente, ou feita com o runtime `ollama` ou `openai-compatible`, falhava ao validar o snapshot. Só o Brand Profile, que usa outro esquema, escapava. O esquema aceita agora os quatro runtimes e os dois campos B5. Há testes no executor para ambos os casos.
- **UI.** Nos editores de Copy, Website, Social, Ads e Video, `ClaimReviewNotice` mostra «Check these claims before using the text» com as palavras de `claimRevision.remaining`, quando sobra alguma. Sem marcas, mostra só quantos excertos do cliente foram usados e quantas alegações a revisão tirou. Sem conhecimento, não mostra nada. Uma edição manual mantém apenas as marcas cujas palavras ainda estão no texto (`claimRevisionAfterEdit`), na provenance guardada e na cópia dentro do snapshot.
- **Estilo.** A regra global `* { border-color }` passou para `@layer base`. Fora de camada, ganhava a todas as utilidades de cor de contorno do Tailwind (`border-error` incluído).

### Medição em português (gemma4:12b-it-qat, Apple M4, 5 amostras por caso, casos de copy)

Contagens com o detetor final, recalculadas sobre os textos guardados. A corrida «sem conhecimento» não guardou textos, por isso conta com o detetor da altura.

| | Sem conhecimento | Com conhecimento | Com conhecimento + revisão |
|---|---|---|---|
| Descrição de produto: atributos inventados | 0 | 8 (*sustentáveis, durável, durabilidade, ultra-leve*) | **2** (*ultra-leve*; 7 antes da revisão, 3 de 5 amostras revistas) |
| Email: atributos inventados | 0 | 1 (*durabilidade*) | **0** (1 antes; 1 de 5 revista) |
| FAQ: atributos inventados | 0 | 0 | 0 |
| Lista de controlo (sinónimos), descrição + email | 3 | 15 (*leveza, duradouro*) | 14 (*leveza, duradouro, resistente*) |
| Factos da ficha usados (de 5) | — | 5 | 5 |
| JSON válido | 100% | 100% | 100% |
| Latência p50 / p95, descrição | 48 / 71 s | 60 / 64 s | **131 / 153 s** |
| Latência p50 / p95, email | 42 / 59 s | 50 / 56 s | 56 / 122 s |

As 2 marcas de *ultra-leve* que sobram vêm de o detetor da corrida não conhecer ainda a grafia com hífen: a revisão nunca as recebeu. Com o detetor final, seriam enviadas para revisão.

**Inglês, repetição com o detetor novo** (mesma sessão, com revisão): descrição 6 marcas → **0** (4 de 5 revistas), FAQ 2 → **0** (2 de 5), email 0. Lista de controlo: 3 (*eco*, *light on your feet*). Factos 5 de 5. Latência p50 da descrição: 107 s. O resultado anterior mantém-se.

### Leitura de textos revistos (amostras guardadas, pt-PT)

- **A revisão é cirúrgica.** Tira a frase ou o adjetivo marcado e deixa o resto igual. Por exemplo, «Material de gáspea sustentável com poliéster reciclado» passa a «Material de gáspea com poliéster reciclado», e «Sapatos leves, sustentáveis e práticos» a «Sapatos leves e práticos».
- **Às vezes leva factos verdadeiros.** Numa amostra, ao tirar «sustentável», o modelo apagou o benefício inteiro, com o poliéster reciclado (que a ficha diz). Apagou também «Processo de produção direto ao consumidor», que o brief suporta. O facto continuava noutro campo, por isso a contagem de factos usados (5 de 5) não o mostra.
- **Só sai o que está na lista.** A revisão não tira a mesma qualidade dita por outras palavras: *Conforto duradouro*, *Peso ultra-leve*, *leveza* e *sapatos leves* ficam. A lista de controlo não desce com a revisão (15 → 14). Também há inferências que nenhuma lista apanha: *Segurança em superfícies molhadas* (a partir do piso em espinha) e *Fácil manutenção e higiene* (a partir da palmilha lavável).

**Leitura:** em português, a revisão faz o mesmo que em inglês. Desce as palavras da lista para perto de zero sem perder factos, ao custo de cerca do dobro do tempo na descrição de produto. Mas o «0» do R8 mede a lista, não a ausência de inferências. Os textos com conhecimento continuam a ter qualidades deduzidas com outras palavras, e a revisão não as vê. Por isso as marcas na UI são um aviso parcial: o texto continua a precisar de revisão humana, sobretudo nas descrições de produto. Isso já está dito no aviso fixo do editor («Review factual claims… before use»).

**Seguinte:** alargar a lista aos sinónimos frequentes ou testar uma revisão orientada pela ficha. **Decidido a 2026-11-17: alargar a lista** (secção seguinte).

## B5 com a lista alargada (2026-11-17)

**Decisão do product owner:** os sinónimos que sobreviviam à revisão passam a dispará-la.

- **Detetor:** a antiga lista de controlo passa para `unsupportedClaimHits`.
  - Inglês: *featherlight, lightness, light on your feet, eco, planet, long-lasting, hard-wearing, built to last, airy, plush*…
  - Português: *leveza, leves, leve como, duradouro, resistente, amigo do ambiente, planeta, arejado, macio, baixo impacto, impacto reduzido, materiais responsáveis*…
  - *Leve* no singular continua de fora, porque é também forma do verbo levar.
- **Nova lista de controlo, só de medição:** palavras que o detetor não conhece, para a medição continuar independente.
  - Inglês: *weightless, barely there, conscious, kinder to, low-impact, rugged, sturdy, resilient, soft, premium*…
  - Português: *levinho, sem peso, consciente, robusto, resistência, suave, nuvem, premium*.

Aplicado aos textos guardados das corridas anteriores, o detetor alargado não marca factos da ficha. Há dois casos discutíveis: «caminhadas leves» (o adjetivo é das caminhadas) e «Eco-conscious shoppers» (público-alvo).

**Medição** (gemma4:12b-it-qat, Apple M4, 5 amostras por caso, com conhecimento e revisão):

| | pt-PT | en |
|---|---|---|
| Descrição de produto: marcas antes → depois da revisão | 17 → **0** (5 de 5 revistas) | 10 → **0** (5 de 5) |
| Email | 1 → **0** (1 de 5) | 5 → **0** (4 de 5) |
| FAQ | 3 → **0** (3 de 5) | 3 → **0** (3 de 5) |
| Nova lista de controlo | 5 (*consciente, sem peso*) | 3 (*conscious*) |
| Factos da ficha usados (de 5) | 5 | 5 |
| JSON válido | 100% | 100% |
| Latência p50 / p95, descrição | 130 / 165 s | 104 / 121 s |
| Latência p50 / p95, email | 53 / 129 s | 83 / 103 s |
| Latência p50 / p95, FAQ | 88 / 122 s | 78 / 93 s |

**Leitura de textos revistos (pt-PT):** as edições ficam mais finas. «Peso ultra-leve de 280g» passa a «Peso de 280g», e «Conforto duradouro» a «Conforto». Ainda escapam:
- *calçado leve* e *peso leve* (o singular está fora de propósito);
- *reduz o impacto ambiental*;
- *reduzir a fadiga*.

Numa amostra, a revisão apagou benefícios inteiros em vez de tirar só a palavra.

**Leitura:** com a lista alargada, as qualidades que sobreviviam já não passam. A nova lista de controlo apanha poucas fugas (3 a 5 em 15 amostras), e os factos mantêm-se. O custo é mais revisões. Em inglês, o email passa de 1 a 4 amostras revistas em 5, e o p50 do email e da FAQ sobe para 80–90 s. A descrição de produto, em que quase todas as amostras já eram revistas, fica igual. O «0» continua a medir listas: as inferências descritas por frases (*reduz o impacto ambiental*, *reduzir a fadiga*) só uma revisão orientada pela ficha as apanharia. O aviso fixo de revisão humana no editor mantém-se.

## B5: revisão orientada pela ficha (2026-11-19)

A revisão por lista só vê palavras. A **revisão orientada pela ficha** (`KNOWLEDGE_CLAIM_REVISION=grounded`; no eval, `--claim-revision-mode grounded`) corre sobre todos os resultados que usaram conhecimento do cliente, mesmo sem marcas do detetor. Pede que cada qualidade, benefício ou resultado atribuído ao produto esteja no contexto ou num excerto. Quando é só uma inferência, deve ser reescrita como o próprio facto («280 gramas no tamanho 42» em vez de «leve»). O modo `list` continua a ser o padrão.

Também nesta mudança:
- O detetor deixa de ler campos `id`: um identificador `urbanstride-materials-eco` era marcado como «eco».
- A lista de controlo ganha inferências em forma de frase, lidas nas amostras: *fatigue/fadiga, environmental impact/impacto ambiental, easy maintenance/fácil manutenção*.

**Medição** (gemma4:12b-it-qat, Apple M4, 5 amostras por caso, casos de copy com conhecimento). A coluna «lista» volta a pontuar as amostras guardadas de 2026-11-17 com a lista de controlo atual. A versão 1 do prompt cortava perguntas inteiras às FAQ; a versão 2 diz que o que o brief afirma está suportado e pede para reescrever em vez de apagar.

| | Lista pt-PT | Ficha v1 pt-PT | Ficha v2 pt-PT | Lista en | Ficha v1 en | Ficha v2 en |
|---|---|---|---|---|---|---|
| Marcas do detetor no fim | 0 | 0* | 0 | 0 | 0 | 0 |
| Inferências na lista de controlo (15 amostras) | 11 | 0 | 2 | 10 | 3 | 2 |
| Factos da ficha (mínimo por amostra, de 5) | 5 | 5 | 5 | 5 | 5 | 5 |
| Texto que fica depois da revisão, descrição / FAQ | 95% / 95% | 83% / 60% | 92% / 89% | 98% / 97% | 81% / 79% | 84% / 94% |
| Itens de listas na descrição, antes → depois | 98 → 88 | 87 → 73 | 94 → 83 | 87 → 84 | 88 → 76 | 87 → 76 |
| Menções a conforto, antes → depois | 87 → 83 | — | **88 → 48** | 77 → 76 | — | **78 → 49** |
| Amostras revistas | 9 de 15 | 15 de 15 | 15 de 15 | 12 de 15 | 15 de 15 | 15 de 15 |
| Latência p50 email / descrição / FAQ | 53 / 130 / 88 s | 110 / 126 / 96 s | 114 / 136 / 106 s | 83 / 104 / 78 s | 84 / 103 / 88 s | 86 / 104 / 88 s |

\* A marca «eco» da FAQ vinha de um campo `id`, que o detetor já não lê.

**Leitura dos textos revistos (pt-PT, versão 2):**
- **O que melhora:** as inferências passam a factos. «Peso reduzido de 280g» fica «Peso de 280 gramas no tamanho 42», e os tamanhos ganham «sem meios números».
- **O que se perde:** o modelo também tira o conforto, que o brief promete («Comfortable walking shoes», «all-day comfort»). «Conforto e Design para a Cidade» passa a «Design para a Cidade» no título, no título SEO e na meta descrição. «Pessoas que procuram calçado confortável» passa a «Pessoas que procuram calçado». Isto acontece mesmo com o prompt a dar o conforto como exemplo de afirmação suportada pelo brief.
- **Em inglês** acontece o mesmo («comfort» 78 → 49).

**Conclusão:** com o gemma4, a revisão orientada pela ficha apanha as inferências que a lista não vê (11 → 2 e 10 → 2), mas corta cerca de 40% da promessa central da marca e revê todos os textos. O email em português passa de 53 para 114 s. É uma troca pior do que a da lista. **O padrão fica `list`.** O modo `grounded` fica disponível para voltar a medir com um modelo de texto mais forte. O aviso fixo de revisão humana no editor continua a ser a defesa contra inferências por frase.

