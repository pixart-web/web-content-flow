# AI Gateway — Arquitetura proposta

**Estado:** Proposta para aprovação. Nada nesta proposta está implementado.
**Data:** 2026-11-13
**Base factual:** [Estado real do projeto](../audits/current-project-status.md), §7
**Decisões:** ADR-069 a ADR-077 em [27-architecture-decision-records.md](27-architecture-decision-records.md)

## 1. Objetivo e restrições

Evoluir a camada atual (`AiProvider` com MOCK e OPENAI fixos no código) para um **AI Gateway** que:

- corre modelos **locais e self-hosted** (Ollama, MLX, qualquer endpoint compatível com OpenAI);
- escolhe o modelo por **política de tarefa**, a partir de um **Model Registry** e de um **AI Router** determinístico;
- isola o **conhecimento de cada cliente** (RAG por conta ou projeto);
- tem **observabilidade, quotas, limites e versionamento**;
- usa **fallback externo só por opção explícita**, nunca obrigatório;
- **preserva** os jobs, os schemas zod, as versões imutáveis, a provenance, as quotas e o fencing de leases que já existem;
- serve tanto uma instalação **local-first em macOS** como um deploy no **Nodera/Hetzner**;
- pode ser exposto mais tarde ao **Kiko** através de uma API versionada.

Fora de âmbito nesta fase: treino ou fine-tuning de modelos, dependências pesadas (runtimes de inferência dentro do processo Node, bases vetoriais dedicadas) e routing por custo, latência ou qualidade aprendido por ML.

## 2. Decisão central: gateway como porta interna, com o Nodera como backend opcional

O Nodera já implementa um AI Gateway em Go para todo o ecossistema, e o Web Content Flow está documentado como consumidor previsto. Construir um segundo gateway completo e autónomo duplicaria registry, router, adapters e usage.

Proposta (ADR-069):

```
                      ┌────────────────────── Web Content Flow ─────────────────────┐
 handlers/serviços ──▶│ AiGateway (porta)                                           │
                      │   ├─ TaskPolicyResolver  (tarefa → política versionada)     │
                      │   ├─ AiRouter            (política + registry → candidatos) │
                      │   ├─ Guards              (quota, limites, privacidade)      │
                      │   ├─ RetrievalService    (RAG por cliente, opcional)        │
                      │   └─ RuntimeAdapters ────┬─ mock (determinístico)           │
                      │                          ├─ openai-compatible (HTTP)        │──▶ MLX server, llama.cpp,
                      │                          │                                  │    vLLM, LM Studio, OpenAI
                      │                          ├─ ollama (HTTP nativo)            │──▶ Ollama
                      │                          └─ nodera (HTTP /api/v1/ai)        │──▶ Nodera AI Gateway
                      │   Observabilidade: GenerationUsage + logs estruturados      │
                      └─────────────────────────────────────────────────────────────┘
```

- **Modo standalone ou local-first:** o próprio Web Content Flow escolhe o modelo e chama diretamente um runtime local. É assim que corre num Mac sem o Nodera.
- **Modo Nodera:** a política de tarefa aponta para um *profile* do Nodera, e o adapter `nodera` delega nele o routing, o fallback e a política de privacidade. O Web Content Flow continua a validar o resultado com zod e a gravar a provenance.
- Os dois modos usam **o mesmo contrato interno**, por isso os handlers não mudam.

**Pré-requisito no Nodera:** hoje o `/api/v1/ai/chat` só devolve texto livre. Para o modo Nodera, o Nodera tem de passar a aceitar `response_format` com JSON Schema (e mais tarde `embed`). Isso fica registado como dependência noutro repositório (ver o backlog, tarefa AG-D1).

## 3. Contratos

### 3.1 Porta `AiGateway`

```ts
interface AiGateway {
  generateStructured<T>(req: GatewayStructuredRequest, schema: ZodType<T>): Promise<GatewayResult<T>>;
  embed(req: GatewayEmbedRequest): Promise<GatewayEmbedResult>;   // Fase E
  health(): Promise<GatewayHealth>;                                // runtimes disponíveis e modelos carregados
}

type GatewayStructuredRequest = {
  task: TaskKey;                 // ex.: "social.post.generate"
  promptKey: string; promptVersion: string;
  input: unknown;                // contexto já validado pelo prompt
  tenant: { userId: string; projectId: string };
  privacy: "public" | "internal" | "confidential" | "restricted";
  requestId: string;             // id do job (idempotência e correlação)
  signal: AbortSignal;           // obrigatório: abortar quando a lease se perde
};

type GatewayResult<T> = {
  data: T;
  route: {                        // vai para a provenance e para o GenerationUsage
    runtimeKey: string;           // "ollama-local", "mlx-local", "openai", "nodera"
    providerKind: "mock" | "local" | "self_hosted" | "cloud";
    modelRef: string;             // "<runtimeKey>/<modelId>"
    policyKey: string; policyVersion: string;
    fallbackUsed: boolean; repairAttempted: boolean;
    structuredMode: "native_schema" | "json_mode" | "prompted";
  };
  usage: NormalizedUsage & { latencyMs: number };
};
```

O `AiProvider` atual continua a ser a interface dos adapters, com três acrescentos: `capabilities()`, `structuredMode` e `latencyMs`. O `generateProductionSnapshot` passa a chamar o gateway em vez de `getGenerationProvider({provider: "OPENAI"})`.

### 3.2 Model Registry (ADR-071)

Na Fase B é **configuração versionada no repositório**: TypeScript validado com zod e revisto em PR. Não é editável em runtime. A base de dados só vem quando houver necessidade operacional real.

```ts
type RegisteredModel = {
  ref: string;                    // "ollama-local/qwen-x:14b" — formato igual ao do Nodera
  runtimeKey: string;
  providerKind: "local" | "self_hosted" | "cloud";
  capabilities: { structured: "native_schema" | "json_mode" | "prompted"; embeddings: boolean;
                  contextTokens: number; maxOutputTokens: number; languages: string[] };
  status: "active" | "evaluation" | "disabled";
  pricing?: ModelPrice;           // cloud: preço por milhão de tokens; local: custo 0 ou amortizado
  evaluation?: { suiteVersion: string; passedAt: string; hardware: string };  // ADR-077
};
```

### 3.3 Políticas por tarefa (ADR-071)

```ts
type TaskPolicy = {
  key: TaskKey; version: string;
  requiredCapabilities: ("structured" | "long_context" | "pt" | "en")[];
  privacy: "public" | "internal" | "confidential" | "restricted";
  preferred: string[];            // modelRefs, por ordem
  externalFallback: { allowed: boolean; refs: string[] };   // allowed=false por omissão (ADR-073)
  budgets: { maxInputTokens: number; maxOutputTokens: number; timeoutMs: number };
  repair: "NONE" | "STRUCTURE_ONCE";
  retrieval?: { enabled: boolean; topK: number; maxTokens: number };  // Fase E
};
```

As tarefas vêm do registo de prompts que já existe (42 definições em 7 módulos). Na Fase B todas as tarefas apontam para uma política "default" que reproduz exatamente o comportamento atual.

### 3.4 Router (determinístico)

1. Resolve `TaskPolicy@version`.
2. Calcula a **privacidade efetiva**: o valor mais restritivo entre a política e a definição do projeto ou conta.
3. Percorre `preferred` e descarta modelos `disabled`, sem as capacidades exigidas, com runtime em baixo (`health`), ou cloud quando a privacidade é `restricted`.
4. Se não houver candidatos e `externalFallback.allowed` for verdadeiro **e** o projeto tiver dado consentimento explícito, percorre `externalFallback.refs`.
5. Se ainda assim não houver candidatos, devolve um `ProviderError("PROVIDER_UNAVAILABLE", retryable: true)`, e o retry durável que já existe trata do resto.
6. A decisão (candidatos avaliados e motivo de cada exclusão) fica registada no log estruturado, **sem conteúdo**.

### 3.5 Output estruturado em runtimes locais (ADR-072)

| Runtime | Modo | Mecanismo |
|---|---|---|
| OpenAI API | `native_schema` | `responses.parse` + `zodTextFormat` (como hoje) |
| Ollama | `native_schema` | `format: <JSON Schema>` em `/api/chat` |
| llama.cpp server | `native_schema` | `response_format` / `json_schema` (gramática) |
| vLLM | `native_schema` | `response_format: json_schema` (guided decoding) |
| MLX (`mlx_lm.server`) e LM Studio | `json_mode` ou `prompted` | A confirmar por runtime e versão na Fase C. Não assumir suporte. |

O zod **é sempre a validação autoritativa**. O modo `prompted` junta o schema às instruções e valida a resposta, e a reparação estrutural já existente (`STRUCTURE_ONCE`) mantém-se. Um modelo só entra em `active` para uma tarefa se passar a suite de avaliação dessa tarefa (ADR-077).

## 4. RAG e conhecimento isolado por cliente (ADR-074, Fase E, só com requisitos validados)

- **Armazenamento:** PostgreSQL com `pgvector`, na mesma base. Não há base vetorial separada.
- **Modelo de dados (aditivo):** `KnowledgeSource` (dono, projeto, tipo, origem, estado), `KnowledgeChunk` (texto, hash, posição) e `KnowledgeEmbedding` (vetor, `modelRef` e dimensão, para que mudar o modelo de embeddings reindexe sem misturar vetores).
- **Isolamento:** todas as consultas passam por um repositório que **exige** `userId` e `projectId`. Não há nenhuma função de pesquisa sem âmbito. O RLS do PostgreSQL fica como defesa adicional numa segunda etapa. Testes de integração provam que o projeto A nunca recebe chunks do projeto B.
- **Fontes iniciais:** só conteúdo que o produto já tem (brief, versões do Brand Profile, versões aprovadas de conteúdo). Uploads continuam fora do MVP.
- **Provenance:** cada geração com RAG regista os ids e hashes dos chunks usados.
- **Ingestão:** é um tipo de job no worker que já existe (lease, fencing, retry). Não há fila nova.

## 5. Observabilidade, quotas, limites e versionamento (ADR-075)

| Requisito | Proposta |
|---|---|
| Uso | `GenerationUsage` ganha colunas aditivas: `runtimeKey`, `providerKind`, `modelRef`, `policyKey@version`, `latencyMs`, `fallbackUsed`, `structuredMode`, `outcome` |
| Custo | Preços no Model Registry. O modelo local tem custo monetário 0, mas regista tokens e tempo. É o fim do custo sempre `null` (BL-11). |
| Quotas | A reserva de tokens atual mantém-se e passa a aplicar-se também a modelos locais, para proteger a capacidade da máquina |
| Concorrência | `AI_MAX_CONCURRENT_REQUESTS` passa a ser aplicada **por runtime** (semáforo no worker), porque um Mac local aguenta 1–2 pedidos em simultâneo |
| Logs | Eventos JSON `ai.route.selected`, `ai.request.completed` e `ai.request.failed`, com `requestId` e sem prompt nem resposta. `AI_PROMPT_DEBUG_ENABLED` passa a ter efeito real, mas só em local e test. |
| Health | `/health/ready` inclui o estado dos runtimes configurados. A falta de um runtime opcional dá *degraded*, não falha. |
| Versionamento | Prompt, política, schema e `modelRef` ficam todos na provenance, o que permite reproduzir uma geração |

## 6. Topologias suportadas

| Topologia | Web e worker | Runtime de IA | Notas |
|---|---|---|---|
| Desenvolvimento (atual) | Mac | mock | Sem alterações |
| Local-first macOS | Mac (Node + PostgreSQL) | Ollama ou MLX em `localhost` | Privacidade `restricted` possível. Concorrência 1. |
| Self-hosted Hetzner via Nodera | Contentores geridos pelo Nodera | Nodera AI Gateway → Ollama ou vLLM no próprio servidor | Requer AG-D1 (output estruturado no Nodera) |
| Cloud (atual opt-in) | Render ou Hetzner | OpenAI | Só com `externalFallback` ou política explícita |

## 7. Integração futura com o Kiko (ADR-076)

API versionada `/api/v1/` no Web Content Flow, **contract-first** (OpenAPI no repositório), com tokens de serviço com âmbito por conta e as mesmas regras de dono. As operações candidatas (gerar conteúdo para um projeto, ler versões e exportar) reutilizam os serviços e jobs que já existem. Não há implementação até a decisão D-6 definir o que o Kiko precisa.

## 8. O que **não** muda

As tabelas `GenerationJob`, `ContentItemVersion` e `BrandProfileVersion` mantêm-se, todas as migrations novas são aditivas, os schemas zod dos módulos e a regra "a provenance nunca vem do modelo" mantêm-se, e o fencing de leases, o retry durável, a reserva de quota e o modo mock continuam iguais. A Fase B é uma refatoração **sem mudança de comportamento**, verificada pelos testes que já existem.

## 9. Validação de hardware antes de modelos locais (ADR-077)

Máquina de desenvolvimento observada: Apple M4, 32 GB de memória unificada, cerca de 40 GB livres em disco, sem Ollama nem MLX instalados.

Antes de escolher modelos, é preciso:

1. Definir o hardware alvo (decisão D-5).
2. Correr uma **suite de avaliação** por tarefa (seed UrbanStride + fixtures sintéticas) que meça a taxa de JSON válido à primeira, a taxa de reparação, o cumprimento das regras do Brand Profile (palavras proibidas, idioma, sem factos inventados), a latência p50/p95 e a memória máxima.
3. Usar critérios de entrada definidos no [plano de testes](47-execution-plan-and-backlog.md#5-plano-de-testes-e-critérios-de-aceitação).

Nenhum modelo é descarregado nem instalado sem esta decisão.
