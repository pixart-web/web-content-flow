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
3. Medir também com ficha e resultado em português. O detetor atual só conhece termos em inglês. *Por fazer.*

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

Ligado sem estes passos, que ficam como trabalho seguinte: ler uma amostra de textos revistos, medir em português (hipótese 3) e mostrar na UI as marcas que sobram (`claimRevision.remaining`). **Desktop (2026-11-17):** na página «Local AI», o cartão «Client knowledge» descarrega o `bge-m3` pelo mesmo fluxo dos modelos de texto (licença MIT aceite antes do download, digest fixo verificado) e reinicia a app. A partir daí o invólucro define `KNOWLEDGE_EMBEDDING_MODEL=bge-m3` e `AI_OLLAMA_BASE_URL` para o worker, mesmo sem modelo de texto ativo. Desligar volta a reiniciar sem o modelo. A página de conhecimento de cada projeto aponta para essa configuração enquanto não estiver ligada.
