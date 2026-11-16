# Skills e conhecimento por cliente (L6)

**Data:** 2026-11-16 · **Estado:** parte A implementada (sem mudança de comportamento); parte B em **proposta**, à espera de decisões · **Arquitetura:** [49](49-local-first-architecture-proposal.md) §3.7 (ADR L-7) · **Fase E original:** ADR-076, E-01…E-05

## A. Pacotes de skills (implementado)

As skills de produto são executadas pelos agentes locais do Web Content Flow. Não confundir com as skills de desenvolvimento do Claude Code, que estão no [doc 50](50-claude-code-environment-and-skills.md).

| Peça | Ficheiro | O que faz |
|---|---|---|
| Manifesto | `src/skills/skill-manifest.ts` | `skill.json` validado com zod: id, versão, licença, módulo, tipos de conteúdo, prompts (chave e versão no registo), casos de avaliação, perfil mínimo, compatibilidade e hash sha256 de cada ficheiro |
| Skills incorporadas | `src/skills/builtin-skills.ts` | Os 7 módulos atuais descritos como skills (`wcf.brand-profile`, `wcf.website`, …), gerados a partir do registo de prompts |
| Verificação | `verifyPackageFiles()` | Recusa ficheiros em falta, alterados ou com caminhos que saem do pacote |

**Regras de segurança do formato**

1. **Um pacote é só dados.** Pode trazer manifesto, orientação e exemplos, nunca código. O `kind` só aceita os tipos previstos (`skill` agora; `template`, `component`, `animation` e `agent` para o Experience Studio).
2. **A validação é sempre da app.** Os outputs são validados pelos schemas zod da aplicação, referidos por módulo e tipo de conteúdo. Um pacote não traz schemas próprios.
3. **Um pacote não sai do seu módulo:** os prompts referidos têm de pertencer ao módulo declarado.
4. **Skills incorporadas não têm `guidance`**, só as instruções da própria app.
5. **Integridade:** cada ficheiro tem o seu sha256 no manifesto, e qualquer alteração é detetada.

**Testes:** as 7 skills cobrem todos os prompts registados, cada um uma só vez. Os casos de avaliação referidos existem. Pacotes que saem do módulo, que trazem `guidance` sendo incorporados ou que declaram tipos desconhecidos são recusados.

**Fora desta parte, de propósito:** usar a `guidance` de pacotes instalados na geração. É texto de terceiros que entra nas instruções do modelo, ou seja, uma superfície de prompt injection, e precisa da decisão B5.

## B. Conhecimento por cliente (proposta)

**Objetivo:** cada projeto pode ter documentos próprios (catálogo, tabela de preços, FAQ interna, tom de voz, materiais de marca), que alimentam a geração de forma local e sem misturar clientes.

### Requisitos

| # | Requisito |
|---|---|
| R1 | O conhecimento pertence a um projeto. Uma pesquisa nunca devolve excertos de outro projeto (teste de isolamento obrigatório) |
| R2 | Funciona offline: embeddings gerados localmente (Ollama), sem serviços externos |
| R3 | Português e inglês, no mínimo |
| R4 | A geração mostra que excertos usou (provenance), e o utilizador pode remover um documento, o que remove os seus excertos |
| R5 | Trocar o modelo de embeddings não mistura vetores: cada excerto guarda o modelo e a versão, e a reindexação é idempotente |
| R6 | O texto recuperado entra como **contexto não confiável**, nunca como instruções (a mesma regra dos prompts atuais) |
| R7 | Orçamento de tokens por pedido, para não estourar modelos locais com contexto curto |
| R8 | Ganho medido: a avaliação (`eval:ai`) mostra menos atributos inventados nos casos com documentos do cliente. Sem ganho medido, a funcionalidade não é ativada |

### Armazenamento dos vetores: medido em 2026-11-16 (M4, Node 26)

O `pgvector` não vem nos binários do PostgreSQL embutido (L0). Pesquisa por força bruta em memória, com vetores normalizados:

| Excertos | Dimensões | Tempo por pesquisa | Memória |
|---|---|---|---|
| 2 000 | 768 | 1,2 ms | 6 MB |
| 10 000 | 768 | 5,4 ms | 29 MB |
| 50 000 | 768 | 27,2 ms | 146 MB |
| 10 000 | 1024 | 7,2 ms | 39 MB |

| Opção | Prós | Contras |
|---|---|---|
| **1. Vetores em PostgreSQL (`bytea`), pesquisa em Node por projeto** (recomendada) | Sem extensões nem dependências; funciona igual nos 3 sistemas; backups e snapshots já cobrem os dados; rápido até dezenas de milhares de excertos por projeto | Não escala para milhões (não é preciso: o âmbito é um projeto) |
| 2. Compilar o `pgvector` para cada plataforma | Índices HNSW e pesquisa em SQL | Builds nativos para macOS, Windows e Linux, mais manutenção a cada versão do PostgreSQL |
| 3. Base vetorial separada (sqlite-vec, LanceDB) | Índices próprios | Segundo motor de dados, segundo backup, mais superfície |

Recomendação: **opção 1**, atrás de uma interface (`KnowledgeIndex`), para se poder passar para o `pgvector` se algum dia for preciso.

### Modelo de embeddings

Tem de ser multilingue (R3), ter licença compatível (allow-list do catálogo) e caber no perfil Standard ao lado do modelo de texto. Candidatos a avaliar, com a licença **confirmada no próprio artefacto** antes de entrar no catálogo:

| Candidato | Notas |
|---|---|
| `bge-m3` | Multilingue, ≈ 1,2 GB |
| `qwen3-embedding` (tamanho pequeno) | Multilingue |
| `nomic-embed-text` | Pequeno, sobretudo inglês: referência de comparação |

A escolha sai de um conjunto de avaliação de recuperação em PT e EN (perguntas → excerto certo nos primeiros 3), feito com documentos sintéticos de um cliente fictício.

### Plano proposto

| Passo | Entrega | Precisa de |
|---|---|---|
| B1 | Migration aditiva: `KnowledgeDocument` e `KnowledgeChunk` (texto, `embedding bytea`, modelo, versão, `projectId` obrigatório) | **Aprovação da migration** |
| B2 | Ingestão: texto e Markdown colados ou carregados → excertos → embeddings via Ollama (`/api/embed`) num job do worker | B1 |
| B3 | `KnowledgeIndex` com âmbito obrigatório por projeto + teste de isolamento (R1) | B1 |
| B4 | Avaliação de recuperação PT/EN e escolha do modelo de embeddings (download aprovado por ti) | B2 |
| B5 | Injeção dos excertos como contexto não confiável, com orçamento de tokens e provenance; medir o ganho no `eval:ai` (R8) | B3, B4 |
| B6 | PDF e DOCX | Escolha de bibliotecas de parsing (dependência nova) |

### Decisões pedidas

1. **Armazenamento:** opção 1 (vetores em PostgreSQL, pesquisa em Node)?
2. **Migration B1** (`KnowledgeDocument` e `KnowledgeChunk`, aditiva): aprovada?
3. **Formatos na primeira versão:** só texto e Markdown, com PDF e DOCX depois (B6)?
4. **Downloads para avaliação:** posso descarregar os 2 ou 3 modelos de embeddings candidatos (até cerca de 2,5 GB no total) para o B4?
5. **`guidance` de skills instaladas:** fica desligada até haver uma loja ou catálogo assinado de pacotes? (Recomendado: sim.)
