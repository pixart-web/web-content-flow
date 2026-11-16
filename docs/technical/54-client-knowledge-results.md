# Conhecimento por cliente — resultados B1 a B4

**Data:** 2026-11-16 · **Proposta e decisões:** [53-skills-and-client-knowledge.md](53-skills-and-client-knowledge.md) (PR #48) · **Estado:** B1 a B4 implementados; B5 a seguir.

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

## A seguir: B5

Injetar os excertos encontrados como **contexto não confiável**, com orçamento de tokens e provenance dos excertos usados. Depois, medir no `eval:ai` se os atributos inventados diminuem quando o cliente fornece a ficha técnica (R8). A funcionalidade só é ativada se o ganho se confirmar.
