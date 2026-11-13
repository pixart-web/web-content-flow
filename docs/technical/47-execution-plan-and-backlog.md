# Plano de execução, backlog e plano de testes

**Estado:** Proposta para aprovação
**Data:** 2026-11-13
**Entradas:** [Estado real do projeto](../audits/current-project-status.md) · [Arquitetura do AI Gateway](46-ai-gateway-architecture.md) · ADR-069–077

## 1. Princípios

- Estabilizar primeiro, evoluir depois. A Fase A (lançamento) tem prioridade sobre o gateway.
- Uma tarefa corresponde a um PR pequeno, com CI verde e critério de aceitação verificável.
- Sem alterações destrutivas, sem migrations irreversíveis sem aprovação explícita, sem deploy de produção sem autorização.
- Não entram nesta fase: Experience Studio, templates premium, motion builder, nem funcionalidades inspiradas na HorizonX.

Tamanhos: XS < 0,5 dia · S ≈ 1 dia · M ≈ 2–3 dias · L ≈ 1 semana. **Dep.** = dependência; **D-n** = decisão pendente (ver o relatório, §10).

## 2. Fases

| Fase | Objetivo | Depende de |
|---|---|---|
| **A** | Estabilização e caminho para o beta privado | D-1, D-2, D-3 para a infraestrutura |
| **B** | Fundação do gateway sem mudança de comportamento | — (pode correr em paralelo com A) |
| **C** | Runtimes locais e avaliação | B, D-5 |
| **D** | Adapter Nodera | B, AG-D1 (Nodera) |
| **E** | RAG por cliente | B, requisitos validados, D-1 (pgvector) |
| **F** | API versionada (Kiko) | D-6 |

## 3. Backlog priorizado

### Fase A — Estabilização (P0/P1)

| ID | Tarefa | Tam. | Dep. | Aceitação |
|---|---|---|---|---|
| A-01 | Integrar o PR #1 (chaves vazias e avisos de dependências) | XS | — | CI do `main` verde; `cp .env.example .env` arranca sem erro |
| A-02 | Proteção do `main`: CI obrigatório, alterações só por PR, sem force-push | XS | dono do repositório | Um push direto ao `main` é rejeitado |
| A-03 | Atualizações automáticas de dependências (Dependabot ou Renovate) com agrupamento semanal | XS | A-02 | Um PR semanal; o audit deixa de surpreender o `main` |
| A-04 | Decidir a plataforma de deploy (D-1) e atualizar ou substituir o ADR-058 | S | D-1 | ADR aceite; o `render.yaml` ou o manifesto Nodera reflete a decisão |
| A-05 | Provisionar o staging: web, worker, cron, PostgreSQL gerido com PITR | L | A-04 | `/health/ready` 200 no URL de staging; worker com heartbeat |
| A-06 | Corrigir DNS e TLS de `webcontentflow.com` / `app-staging` | S | D-2, A-05 | Certificado válido; sem 404 do Traefik |
| A-07 | Email transacional (D-3), com SPF, DKIM e DMARC; recuperação de password ponta a ponta no staging | M | A-05 | Email entregue numa caixa de teste; bounce monitorizado |
| A-08 | Monitorização: uptime, worker parado, taxa de falha de jobs, alerta sintético | M | A-05 | Alerta de teste recebido; worker parado é detetado em ≤ 5 min |
| A-09 | Backup e restauro isolado (`restore:verify`) com registo de evidência | M | A-05 | Registo em `docs/operations/09-restore-drill-record.md` preenchido |
| A-10 | Abortar a chamada ao provider quando a lease se perde (passar o `signal` do worker ao executor) | S | — | Teste de worker: com a lease perdida, a chamada falsa é abortada e não fica uso registado |
| A-11 | Completar a matriz de crash do worker (AUD-001) e a contabilização de tentativas falhadas (AUD-002) | M | — | Matriz de 15 pontos verde; sem versões nem uso duplicados |
| A-12 | Jornadas E2E combinadas: recuperação com mail sink, exportação, interrupção do worker (AUD-005) | M | A-07 (sink local) | Três specs novos verdes no CI |
| A-13 | Configuração de IA sem efeito: aplicar ou remover `AI_MAX_RETRIES`, `AI_COST_TRACKING_ENABLED`, `AI_PROMPT_DEBUG_ENABLED` (a concorrência fica na B-07) | S | — | Cada variável tem um teste que prova o seu efeito, ou deixa de existir |
| A-14 | Limite de pedidos na criação de jobs de geração | S | — | Teste: a partir do limite, o enqueue devolve um erro tratável e não cria job |
| A-15 | Tirar o cliente Prisma gerado do Git, ou formatá-lo depois do `generate` | XS | — | `prisma generate` deixa o `git status` limpo |
| A-16 | Base de teste separada para os testes de integração e worker (`TEST_DATABASE_URL`) | S | — | Correr os testes não apaga os dados de desenvolvimento |
| A-17 | Smoke da geração real (OpenAI) no staging, num projeto sintético, com limite de custo | S | A-05, B-03 | Um job por módulo completa; uso e custo registados |
| A-18 | Ensaio de rollback e de incidente | S | A-05 | Registo em `docs/operations/11-rollback-rehearsal.md` |

### Fase B — Fundação do gateway (sem mudança de comportamento)

| ID | Tarefa | Tam. | Dep. | Aceitação |
|---|---|---|---|---|
| B-01 | Introduzir a porta `AiGateway` e o adapter `MockRuntime` e `OpenAIRuntime` sobre os providers atuais | M | — | Todos os testes atuais passam sem alterações; o executor deixa de referir `"OPENAI"` diretamente |
| B-02 | `ModelRegistry` e `TaskPolicy` em TypeScript com zod; política "default" equivalente à atual | S | B-01 | Teste: cada prompt registado tem uma política; a resolução é determinística |
| B-03 | Registar preços dos modelos OpenAI configurados (custo deixa de ser `null`) | XS | B-02 | Teste de `calculateUsageCost` com o modelo configurado |
| B-04 | `AiRouter` determinístico com regras de privacidade e fallback (ADR-073) | M | B-02 | Testes de tabela: restricted→cloud rejeitado; sem candidatos → `PROVIDER_UNAVAILABLE` retryable; fallback só com consentimento |
| B-05 | Migration aditiva: `runtimeKey`, `modelRef`, `providerKind`, `policyKey`, `policyVersion`, `latencyMs`, `fallbackUsed`, `structuredMode` (anuláveis) | S | aprovação de migration | Drift limpo; `restore:verify` passa; registos antigos continuam legíveis |
| B-06 | Provenance e usage gravam a `route` do gateway; remover a duplicação no executor | S | B-05 | Snapshot da provenance igual ao atual mais os campos novos |
| B-07 | Semáforo de concorrência por runtime no worker (`AI_MAX_CONCURRENT_REQUESTS`) | S | B-01 | Teste com dois jobs simultâneos e limite 1: o segundo espera ou é reagendado |
| B-08 | Eventos de log `ai.route.selected` e `ai.request.*` sem conteúdo | XS | B-04 | Teste garante que o prompt e a resposta não aparecem nos logs |

### Fase C — Runtimes locais e avaliação

| ID | Tarefa | Tam. | Dep. | Aceitação |
|---|---|---|---|---|
| C-01 | Decisão de hardware alvo (D-5) e orçamento de memória e disco | XS | D-5 | Documento curto com limites |
| C-02 | Adapter `openai-compatible` (base URL e chave opcional), com deteção do `structuredMode` | M | B-01 | Testes de contrato contra um servidor HTTP falso (sucesso, schema inválido, timeout, 429, abort) |
| C-03 | Adapter `ollama` nativo (`/api/chat` com `format` JSON Schema) e `health` com modelos disponíveis | M | B-01 | Mesmos testes de contrato; o `health` reflete modelos ausentes |
| C-04 | Suite de avaliação por tarefa (fixtures UrbanStride e sintéticas) e relatório | M | B-02 | `pnpm eval:ai --model <ref>` produz um relatório reproduzível |
| C-05 | Avaliação real no hardware alvo, com 2–3 modelos candidatos | M | C-01..C-04 | Relatório em `docs/technical/` com métricas; modelos aprovados passam a `active` |
| C-06 | Modo local-first documentado (`.env` de exemplo e runbook macOS) | S | C-05 | Instalação limpa num Mac gera os sete módulos sem chave de cloud |

### Fase D — Nodera

| ID | Tarefa | Tam. | Dep. | Aceitação |
|---|---|---|---|---|
| AG-D1 | **(repositório Nodera)** Output estruturado com JSON Schema em `/api/v1/ai/chat` (e `embed` mais tarde) | M | Nodera | Teste de integração do Nodera com um schema |
| D-02 | Adapter `nodera` (service token, profile ref, propagação do `requestId` e abort) | M | B-01, AG-D1 | Testes de contrato com um servidor falso que imita o Nodera |
| D-03 | Mapeamento entre `TaskPolicy` e os profiles do Nodera, e seed de profiles | S | D-02 | Teste: a tarefa resolve para o profile correto |

### Fase E — RAG (só depois de validar requisitos)

| ID | Tarefa | Tam. | Dep. | Aceitação |
|---|---|---|---|---|
| E-01 | Documento de requisitos de RAG (que fontes, que tarefas beneficiam, métricas) | S | — | Aprovado |
| E-02 | Migration aditiva `Knowledge*` e extensão `pgvector` | S | E-01, D-1 | Drift limpo; extensão disponível no PostgreSQL gerido |
| E-03 | Repositório com âmbito obrigatório e testes de isolamento entre projetos | M | E-02 | O projeto A nunca recebe chunks do B (teste de integração) |
| E-04 | Job de ingestão e `embed` no gateway | M | E-03, C-02/C-03 | Reindexação idempotente; troca de modelo de embeddings sem mistura |
| E-05 | Injeção de contexto recuperado com orçamento de tokens e provenance dos chunks | M | E-04 | A avaliação mostra ganho mensurável nas tarefas escolhidas |

### Fase F — API versionada (Kiko)

| ID | Tarefa | Tam. | Dep. | Aceitação |
|---|---|---|---|---|
| F-01 | Definir as operações com o Kiko (D-6) e o contrato OpenAPI `v1` | S | D-6 | Contrato aprovado no repositório |
| F-02 | Tokens de serviço com âmbito e rate limit | M | F-01 | Testes de autorização: sem acesso entre contas |
| F-03 | Endpoints `v1` sobre os serviços que já existem, com testes de contrato | M | F-02 | O contrato é validado automaticamente no CI |

## 4. Ordem recomendada das próximas duas semanas

1. A-01, A-02, A-15, A-16 (higiene; ~1 dia).
2. A-10, A-13, A-14 (correções de código sem infraestrutura).
3. B-01 → B-02 → B-03 → B-04 (fundação do gateway, sem mudança de comportamento).
4. Assim que houver as decisões D-1, D-2 e D-3: A-04 → A-05 → A-06/A-07/A-08/A-09.
5. B-05 só com aprovação explícita da migration.

## 5. Plano de testes e critérios de aceitação

### 5.1 Gates que se mantêm em todos os PRs

Format, lint e typecheck, os testes unitários, provider, prompts, usage, quota, integração, worker, email, export e security, mais o audit, licenças, segredos, build, bundle e E2E (CI atual). Nenhum PR desta proposta pode desligar ou ignorar um gate.

### 5.2 Novos testes por área

| Área | Tipo | Casos mínimos |
|---|---|---|
| Router | Unitário (tabela) | Prioridade por ordem; capacidades em falta; runtime em baixo; restricted→cloud rejeitado; fallback sem consentimento rejeitado; fallback com consentimento aceite e marcado; sem candidatos → erro retryable |
| Adapters | Contrato (HTTP falso) | Sucesso; JSON inválido → `SCHEMA_VALIDATION_FAILED`; recusa; timeout; 429 com `Retry-After`; 5xx; abort a meio; uso ausente → `UNAVAILABLE` |
| Executor | Integração (PostgreSQL) | A provenance inclui `route`; reserva e reconciliação de quota para local e cloud; reparação única; lease perdida → abort e sem escrita |
| Worker | Worker (PostgreSQL) | Semáforo por runtime; matriz de crash de 15 pontos; sem uso nem versão duplicados |
| Migrations | Integração | Drift limpo; `restore:verify`; leitura de registos antigos sem as colunas novas |
| RAG | Integração | Isolamento entre projetos e contas; reindexação idempotente; dimensão e modelo nunca misturados |
| Observabilidade | Unitário | Logs sem prompt ou resposta; custo calculado; latência registada |
| Avaliação de modelos | Suite `eval` (fora do CI obrigatório) | Por tarefa: JSON válido à primeira ≥ 90 %; depois da reparação ≥ 99 %; 0 violações de palavras proibidas e idioma; 0 factos inventados nas fixtures de verificação; p95 de latência dentro do orçamento da tarefa definido em C-01 |
| E2E | Playwright | Jornadas combinadas da Fase A; geração completa com o runtime falso compatível com OpenAI |

### 5.3 Critérios de aceitação por fase

| Fase | Concluída quando |
|---|---|
| A (beta privado) | BL-01 a BL-07 do relatório fechados com evidência: staging a correr, backup e restauro provados, email entregue, alertas a funcionar, CI verde e protegido |
| B | Zero alterações de comportamento (todos os testes atuais passam sem edição); o executor não refere nenhum provider diretamente; o custo deixa de ser `null` |
| C | Pelo menos um modelo local `active` para cada um dos 7 módulos no hardware alvo, ou um relatório que mostre que o hardware não chega e o que seria preciso |
| D | Os sete módulos geram através do Nodera em staging com output estruturado validado |
| E | Ganho mensurável na avaliação e testes de isolamento verdes |
| F | Contrato `v1` publicado e testado; o Kiko autentica com um token de serviço com âmbito |

## 6. Riscos

| Risco | Mitigação |
|---|---|
| Os modelos locais não atingem a qualidade exigida | Avaliação antes de ativar; o fallback opcional continua possível; o modo mock continua para desenvolvimento |
| O Nodera não chega a ter output estruturado | O Web Content Flow funciona standalone (ADR-069); o adapter Nodera fica adiado |
| A decisão de infraestrutura atrasa o beta | Tarefas A-10 a A-16 e a Fase B avançam sem infraestrutura |
| Uma migration de enum é difícil de reverter | Feita uma única vez, aditiva, com aprovação explícita (ADR-070) |
