# Web Content Flow — Estado real do projeto

**Data:** 2026-11-13
**Âmbito:** auditoria integral na passagem de responsabilidade (Codex → Claude Code)
**Método:** leitura do código, execução local das verificações, logs do GitHub Actions e testes HTTP/DNS ao domínio. Nenhuma conclusão foi retirada só da documentação: quando a documentação e o código divergem, prevalece o código e a divergência fica registada.

Documentos relacionados: [arquitetura do AI Gateway](../technical/46-ai-gateway-architecture.md) · [plano de execução e backlog](../technical/47-execution-plan-and-backlog.md) · [ADR-069–077](../technical/27-architecture-decision-records.md)

## 1. Resumo executivo

| Pergunta | Resposta curta |
|---|---|
| O código compila e os testes passam? | **Sim**, no ramo `fix/blank-optional-env-secrets` (PR #1). O `main` está **vermelho** desde novembro de 2026, porque o `pnpm audit --prod` encontra avisos críticos no `next` 16.4.0. |
| O produto está deployado? | **Não.** Não existe nenhum ambiente a correr a aplicação. O domínio `webcontentflow.com` aponta para um servidor Hetzner com Traefik, mas sem rota para a app: devolve 404 e um certificado TLS por omissão do Traefik. |
| A geração com IA real funciona? | **Não verificada.** O adapter OpenAI existe e está testado com um transporte falso. Nunca correu contra a API real e está desativado por omissão. |
| Os módulos de conteúdo estão completos? | **Sim, em modo mock.** Brand Profile, Website, Social, Ads, Video, Copy e Calendar geram conteúdo determinístico, guardam versões imutáveis e exportam. |
| Pode lançar-se um beta privado? | **Não.** Faltam infraestrutura, backups, monitorização, email transacional e prova de recuperação (AUD-003). A documentação anterior chega à mesma conclusão, e o código confirma-a. |

## 2. Repositório e controlo de versões

| Item | Estado observado | Evidência |
|---|---|---|
| Visibilidade | **Público** | `gh repo view` |
| Ramos | `main` (e46df6c) e `fix/blank-optional-env-secrets` (b7063ca, PR #1 aberto) | `git branch -a` |
| Histórico | 6 commits entre 2026-07-26 e 2026-10-14, todos com o mesmo autor, muitos deles muito grandes (por exemplo "Initialize … through Phase 5") | `git log` |
| Proteção do `main` | **Nenhuma** | API `branches/main/protection` devolve 404 |
| Alterações locais por sincronizar | Nenhuma no código. O `prisma generate` e o `next dev` alteram ficheiros gerados que estão no Git (`src/generated/prisma/*`, `next-env.d.ts`); as diferenças são só de espaços e caminhos | `git status` |
| Tags e releases | Nenhuma | `git tag` |
| Segredos e variáveis no GitHub | Nenhum | `gh secret list`, `gh variable list` |
| Deployments e ambientes no GitHub | Nenhum | API `deployments` e `environments` |

### Histórico de CI

| Run | Commit | Resultado |
|---|---|---|
| 38068694053 | ac98b43 beta launch | falhou |
| 38121894115 | 3e626f3 redesign | falhou |
| 38565801301 | a305caf stabilize | falhou: E2E `phase-2.spec.ts` (link "Review Brand Profile" não apareceu, porque o worker não estava a correr) |
| 38566822422 | e46df6c (main atual) | passou |
| 43455859262 | PR #1, 13d310a | falhou: `pnpm audit --prod` com 8 avisos (next ×4, zod, fast-uri ×3) |
| 43457595208 | PR #1, b7063ca | **passou**: validate e E2E |

Se o CI corresse hoje no `main`, falharia no audit. O PR #1 corrige isso.

## 3. Verificações executadas

Locais, no macOS (Apple M4, 32 GB, Node 26.9, pnpm 11.9, PostgreSQL 16 do Homebrew), no ramo do PR #1 e com as variáveis de ambiente do CI:

| Verificação | Resultado |
|---|---|
| `pnpm install --frozen-lockfile` | PASS |
| `format:check` · `lint` · `typecheck` | PASS · PASS · PASS |
| `test` (unitários) | PASS — 82 |
| `test:provider` · `test:prompts` · `test:usage` · `test:quota` | PASS — 7 · 2 · 2 · 1 |
| `test:integration` (PostgreSQL) | PASS — 8 |
| `test:worker` (PostgreSQL) | PASS — 13 |
| `test:email` · `test:export` · `test:security` | PASS — 6 · 3 · 6 |
| `audit --prod` | PASS depois do PR #1 (antes: 2 críticos, 2 altos, 2 moderados, 2 baixos) |
| `licenses:check` · `secrets:scan` (410 ficheiros) · `security:client-bundle` | PASS |
| `build` (com as variáveis de produção do CI) | PASS |
| Drift entre o schema e as migrations | PASS — sem diferenças; 13 migrations aplicadas |
| `restore:verify` | PASS — 0 ponteiros de versão inválidos |
| E2E Playwright | **CI, run 43457595208:** 63 passaram, 19 ignorados (exclusões por viewport). Não corri o E2E localmente. |
| Cobertura (só unitários) | 14,3 % de linhas no total; `src/server/ai` 15,7 %; `src/workers` 10,3 %. O caminho real da IA e os workers são cobertos sobretudo pelos testes de integração, worker e E2E, que ficam fora desta métrica. |

**Notas de execução:**

- A app recusava arrancar com o `.env.example` copiado sem alterações, porque as chaves vazias falhavam a validação. Está corrigido no PR #1.
- `test:integration` e `test:worker` apagam dados na base indicada em `DATABASE_URL`. Correr estes testes contra a base de desenvolvimento destrói os dados demo. É preciso uma base de teste separada ou voltar a correr o seed.
- `pnpm build` com o `.env` local falha de propósito, porque a produção rejeita `EMAIL_PROVIDER=MOCK`. Não é um defeito.

## 4. Estado por módulo

Legenda: **Completo** = implementado e com testes; **Parcial** = implementado com lacunas confirmadas; **Não implementado** = sem código.

| Módulo | Estado | Notas |
|---|---|---|
| Autenticação (credenciais, sessões em base de dados, Argon2) | Completo | Auth.js com `PrismaAdapter` e estratégia de sessão `database` (30 dias); `requireUser`, `requireProjectOwner` e verificação de dono por item ou versão. |
| Recuperação de password | Parcial | O fluxo e os testes existem. A entrega real de email nunca foi verificada (não há provider nem DNS). Não há outbox durável (AUD-007/009). |
| Registo e verificação de email | Parcial | O registo é controlado por flag. A verificação de email está desativada por omissão e a resposta ao registo não é neutra (AUD-008). |
| Eliminação de conta | Não implementado (desativado) | Aguarda decisão legal (AUD-013). |
| Projetos, brief e onboarding | Completo | |
| Brand Profile | Completo (mock) | Versões imutáveis com ponteiro para a versão atual. |
| Website · Social · Ads · Video · Copy · Calendar | Completo (mock) | Jobs pai e filho, regeneração por secção, campo ou variante, provenance. |
| Exportações (TXT, MD, JSON, CSV; 6 âmbitos) | Completo | Com retenção, limite de tamanho e rate limit. |
| Geração real (OpenAI) | Parcial | Adapter com output estruturado (`responses.parse` + `zodTextFormat`), reparação estrutural e reserva de quota. **Nunca correu contra a API real.** |
| Quotas e uso | Parcial | Reserva e reconciliação de tokens funcionam. **Não há preços registados**: `registerModelPrice` nunca é chamado, por isso o custo fica sempre `null`. |
| Worker e leases | Parcial | Leases com fencing, renovação e retry com backoff (AUD-001/002 parcialmente fechados). Ver §6. |
| Manutenção (retenção e limpeza) | Completo (local) | Nunca foi agendado num ambiente real. |
| Health (`/health/live`, `/health/ready`) | Completo | O ready compara o estado das migrations com a última esperada. |
| Site de marketing e formulário de interesse no beta | Completo | Conteúdo gerido no repositório. Indexação desligada por omissão. |
| Billing, publicação, uploads, equipas, render de imagem/vídeo | Não implementado | Fora do MVP, por decisão documentada. |

## 5. Deployment real vs. GitHub

| Elemento | Repositório diz | Realidade observada |
|---|---|---|
| Plataforma | Render Frankfurt, `render.yaml`, ADR-058 "Proposed" | **Não provisionado**: sem deployments, sem secrets, sem ambientes no GitHub |
| `app-staging.webcontentflow.com` | Domínio do staging | **Não resolve** (sem registo A nem CNAME) |
| `webcontentflow.com` | — | Resolve para um servidor Hetzner. A porta 80 redireciona para HTTPS; a 443 serve **"TRAEFIK DEFAULT CERT"** (autoassinado) e devolve `404 page not found` em `/`, `/sign-in`, `/health/*` e `/app` |
| MX | Resend (`updates.webcontentflow.com`) | O MX aponta para `mail.webcontentflow.com`; `updates.` não existe |
| Base de dados, backups, PITR | PostgreSQL gerido no Render com PITR | **Não existem** |
| Monitorização e alertas | Better Stack | **Não configurado** |

**Conclusão:** o domínio está ligado a um servidor com Traefik, provavelmente da infraestrutura Hetzner ou Nodera, mas nenhum router aponta para a aplicação. Isto contradiz a escolha do Render no ADR-058. Antes de qualquer deploy é preciso decidir a plataforma (ver §8, D-1).

## 6. Migrations, autenticação, segurança e persistência

| Área | Estado | Observações |
|---|---|---|
| Migrations | Bom | 13 migrations aditivas, sem drift. O ready verifica a última migration esperada através de uma constante compilada, que tem de ser atualizada a cada migration (risco de esquecimento). |
| Isolamento entre clientes | Bom | Todas as consultas de repositório filtram por `userId` ou pelo dono do projeto. Não há RLS no PostgreSQL. |
| Headers de segurança | Bom, com uma exceção | Há CSP, HSTS, COOP, CORP e XFO. A CSP permite `script-src 'unsafe-inline'` (AUD-010). |
| Rate limiting | Parcial | Aplicado em autenticação, recuperação de password, exportações e interesse no beta. **Não encontrei limite de pedidos na criação de jobs de geração.** Só existem a idempotência, o limite de jobs ativos por projeto no worker e a quota de tokens em modo real. |
| Segredos | Bom | Scanner de segredos no código e no bundle do cliente. O `.env` está no `.gitignore`. |
| Provenance e imutabilidade | Bom | As versões guardam o provider, o modelo, o prompt e versão, o propósito, a reparação e os registos de uso. |
| Cancelamento | Parcial | Quando o worker perde a lease, as escritas são bloqueadas pelo fencing, mas **a chamada ao provider não é abortada** (o `signal` não é passado). Uma chamada real continua a consumir tokens até ao timeout. |
| Configuração sem efeito | Dívida | `AI_MAX_CONCURRENT_REQUESTS`, `AI_MAX_RETRIES`, `AI_COST_TRACKING_ENABLED` e `AI_PROMPT_DEBUG_ENABLED` são validadas mas **não são lidas por nenhum código**. |
| Geração real parcial | Defeito | Verificado em 2026-11-13 com o transporte OpenAI falso: a regeneração em Ads, Social, Video e Website cria jobs sempre em mock, e a Foundation Copy marca o job como REAL sem chamar o provider (backlog A-19, A-20). A geração inicial dos módulos e a General Copy usam o caminho real corretamente. |
| Repositório público | Risco a confirmar | Docs internos, legais e de auditoria estão visíveis publicamente. Confirmar se é intencional. |

## 7. Camada de IA atual

```
handler (por módulo)
  └─ cria um candidato determinístico (o mock é sempre calculado)
  └─ generateProductionSnapshot(job, candidato, schema, contexto, promptKey)
       ├─ getPrompt(key, "1.0.0")      ← registo em memória, uma instrução genérica para todos os módulos
       ├─ job.mode === MOCK → devolve o candidato validado
       └─ REAL → getGenerationProvider({provider: "OPENAI"})   ← provider fixo no código
              → reserveUsage → OpenAIProvider.generateStructured
              → recordGenerationUsage → reconcile
              → em SCHEMA_VALIDATION_FAILED: reparação única com o tier REPAIR
```

Limitações relevantes para a Tarefa 2:

1. **Provider fixo.** O `GenerationProvider` é um enum do Prisma (`MOCK | OPENAI`) e o executor chama `"OPENAI"` diretamente. A provenance real escreve `provider: "openai"` também diretamente.
2. **Política de modelo mínima.** Há três tiers (`STANDARD`, `PREMIUM`, `REPAIR`) mapeados para variáveis de ambiente, e todos os prompts usam `STANDARD`. Não há políticas por tarefa.
3. **Prompts genéricos.** As 42 definições de prompt (7 módulos) partilham as mesmas instruções e enviam `JSON.stringify({task, untrustedGenerationContext})`. A qualidade da geração real está por validar (AUD-006 parcial).
4. **Sem embeddings nem RAG.** O contexto é o brief, o Brand Profile e o conteúdo de origem, com uma estimativa de tokens de `chars/4`.
5. **Observabilidade.** Regista tokens e tentativas, mas não regista latência nem distingue local de cloud, e não há custo.

**Relação com o Nodera:** o Nodera já implementa em Go um AI Gateway para o ecossistema (`/api/v1/ai/chat`, `profiles`, `models`, `providers`, `usage`), com registry, router determinístico, política de privacidade (perfis `restricted` nunca vão para a cloud) e adapters para Ollama, Anthropic e OpenAI. A documentação do Nodera indica o Web Content Flow e o Kiko como consumidores previstos. Hoje esse gateway **só expõe chat em texto livre**: não tem output estruturado com JSON Schema nem embeddings. Além disso, o Nodera também não está validado em staging. A proposta de arquitetura parte deste facto.

## 8. Bloqueios de lançamento

### Beta privado (P0)

| ID | Bloqueio | Origem | Tipo |
|---|---|---|---|
| BL-01 | Nenhum ambiente deployado (web, worker, cron) | AUD-003 | Infraestrutura + decisão D-1 |
| BL-02 | Sem PostgreSQL gerido, backup, PITR nem teste de restauro | AUD-003 | Infraestrutura |
| BL-03 | Sem email transacional: a recuperação de password não chega a nenhum utilizador | AUD-003/007 | Provider + DNS |
| BL-04 | Sem monitorização nem alertas (uptime, worker parado, falhas de jobs) | AUD-003 | Infraestrutura |
| BL-05 | `main` sem proteção e com CI vermelho no audit | Nova | Repositório (o PR #1 resolve o CI) |
| BL-06 | Matriz de crash do worker incompleta e chamada ao provider não abortada quando a lease se perde | AUD-001 + nova | Código |
| BL-07 | O domínio serve um certificado inválido e devolve 404 | Nova | DNS/infraestrutura |

### Produção controlada (P1)

| ID | Bloqueio | Origem |
|---|---|---|
| BL-08 | Contabilização de tentativas falhadas incompleta | AUD-002 |
| BL-09 | Prompts genéricos e geração real nunca validada contra o provider | AUD-006 + nova |
| BL-10 | Jornadas E2E combinadas (recuperação, exportação, interrupção) em falta | AUD-005 |
| BL-11 | Custos sem preços registados, logo sem controlo de custo real | Nova |
| BL-12 | Rollback e incidentes nunca ensaiados | AUD-003 |
| BL-13 | Configuração de IA sem efeito, o que engana quem opera | Nova |

### Lançamento público (P2)

AUD-008 (resposta neutra no registo), AUD-010 (CSP), AUD-011 (noindex), AUD-012 (alinhar a documentação com o código), AUD-013 (aprovação legal, eliminação de conta, subprocessadores), AUD-016 (tamanho dos alvos tácteis), limite de pedidos na criação de jobs.

## 9. Dívida técnica

| Item | Impacto | Esforço |
|---|---|---|
| Cliente Prisma gerido no Git e regenerado com diferenças de espaços | Ruído em todos os diffs | XS |
| Constante de migration esperada mantida à mão | O ready falha ou dá falso positivo se alguém se esquecer de a atualizar | S |
| Lógica de provenance duplicada no executor (sucesso e reparação) | Fácil divergir | S |
| Handlers enormes (copy 1205 linhas, video 820, calendar 788, ads 783) | Difíceis de manter | M |
| Testes de integração e worker destrutivos na `DATABASE_URL` | Apagam os dados de desenvolvimento | S |
| Commits muito grandes, sem PRs anteriores | Histórico difícil de auditar | Processo |
| Documentação extensa (46 docs técnicos), com duplicados (dois `15-`, `16-`, `22-`, `23-`, `24-`, `26-`) | Difícil saber qual é a fonte de verdade | S |
| Node 26 local vs 24.14 no CI e no `.nvmrc` | Diferenças de runtime | XS |

## 10. Decisões pendentes do responsável do produto

| ID | Decisão | Porque bloqueia |
|---|---|---|
| D-1 | Plataforma de deploy: Render (ADR-058) **ou** Hetzner/Nodera (para onde o DNS já aponta) | BL-01, BL-02, BL-04, BL-07 |
| D-2 | Quem gere o servidor e o DNS de `webcontentflow.com` | BL-07 |
| D-3 | Provider de email (Resend ou outro) e configuração de SPF/DKIM | BL-03 |
| D-4 | Em produção, a IA passa pelo Nodera ou o Web Content Flow mantém um gateway próprio? | Arquitetura (ADR-069) |
| D-5 | Hardware alvo para modelos locais (Mac do cliente, servidor Hetzner com GPU, ou ambos) | ADR-077 |
| D-6 | O que é o Kiko e quais as operações de que precisa | ADR-076 |
| D-7 | O repositório deve ser público? | Exposição de documentação interna |

## 11. Próximos passos recomendados

1. Integrar o PR #1, que põe o CI verde e corrige o arranque com o `.env.example`.
2. Ativar a proteção do `main`: CI obrigatório e alterações só por PR.
3. Tomar as decisões D-1 a D-3 e provisionar o staging (ver o [plano de execução](../technical/47-execution-plan-and-backlog.md), Fase A).
4. Em paralelo e sem impacto em produção, começar a Fase B do AI Gateway (refatoração sem mudança de comportamento).
