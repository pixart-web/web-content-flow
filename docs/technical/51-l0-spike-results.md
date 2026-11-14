# Fase L0 — resultados dos spikes

**Data:** 2026-11-14 · **Máquina:** Apple M4, 32 GB, macOS · **Ramo:** `spike/l0` (não entra no `main`) · **Proposta:** [49-local-first-architecture-proposal.md](49-local-first-architecture-proposal.md)

O código dos spikes está em `spikes/` (cada pasta tem as suas dependências, isoladas da app). As únicas alterações à app neste ramo são duas exceções marcadas "spike only": `output: "standalone"` ativado por `NEXT_OUTPUT`, e `APP_MODE=local` a aceitar `http://127.0.0.1` e email MOCK. O desenho definitivo destas duas peças pertence à L1.

## Resumo

| Spike | Resultado | Decisão proposta |
|---|---|---|
| **LF-01** PostgreSQL embutido | ✅ Tudo passa | **Adotar** (ADR L-3) |
| **LF-02** PGlite | ❌ O worker falha (uma ligação só, transações ficam em espera) | **Rejeitar** para a v1 |
| **LF-03** Electron + Next standalone + worker | ✅ A app real abre em 0,8 s, encerramento limpo | **Adotar** (ADR L-2) |
| **LF-04** Download de modelos via Ollama | ✅ Progresso, cancelamento, retoma e verificação do digest | **Adotar** para o Local AI Engine |

## LF-01 — PostgreSQL embutido (`embedded-postgres` 16.15, binários zonky, MIT)

| Prova | Resultado |
|---|---|
| Plataformas com binários | macOS arm64/x64, Windows x64, Linux x64/arm64 |
| Primeiro arranque (`initdb`) | 3,9 s |
| Arranques seguintes | 0,03 a 0,12 s |
| 14 migrations (`prisma migrate deploy`) | ✅ 2,2 s. `migrate diff` sem diferenças face ao schema |
| `test:integration` (ambiente do CI) | ✅ 8/8 |
| `test:worker` (leases, `SKIP LOCKED`, concorrência B-07) | ✅ 14/14 |
| Postgres morto com `kill -9` | ✅ Recupera sozinho no arranque seguinte. Dados intactos |
| Processo Node supervisor morto com `kill -9` | ⚠️ O Postgres fica **órfão** e o arranque seguinte falha |
| Dados de um workspace vazio e migrado | 69 MB |
| Binários (macOS arm64) | 296 MB tal como instalados. **135 MB** sem os ficheiros repetidos (o ICU vem triplicado) |
| Ferramentas incluídas | Só `initdb`, `pg_ctl` e `postgres`: **sem `pg_dump`**, **sem `pgvector`** |

**Consequências para L2:**
1. **Supervisor:** antes de arrancar, lê `postmaster.pid`. Se esse processo existir e for o nosso Postgres, para-o com `pg_ctl stop -m fast`. Se não existir, apaga o ficheiro.
2. **Backups:** fazer snapshot do diretório com o Postgres parado, ou incluir um `pg_dump` da mesma versão (vem do mesmo projeto zonky, ou de um build próprio).
3. **RAG (L6):** `pgvector` tem de ser compilado e incluído para cada plataforma, ou usa-se um índice vetorial fora do Postgres. A decisão fica para a L6.
4. **Empacotamento:** remover as cópias duplicadas (manter os symlinks) baixa os binários para cerca de 135 MB por plataforma.

## LF-02 — PGlite 0.5.16 + `pglite-socket` 0.2.19 (Apache 2.0)

| Prova | Resultado |
|---|---|
| Primeiro arranque | 16 s (o `initdb` corre em WASM). Seguintes ≈ 1 s |
| 14 migrations | ✅ 2,2 s |
| `test:integration` | ✅ 8/8 |
| `test:worker` | ❌ Transações interativas expiram (Prisma `P2028`, 5 s). Jobs ficam `FAILED`, mesmo com 60 s por teste |
| Extensão `vector` | Existe, mas mudou de pacote nesta versão (`@electric-sql/pglite-pgvector`). Não foi testada |

**Causa:** o PGlite executa uma ligação de cada vez. O worker e os pedidos web abrem transações em paralelo, que ficam em fila até expirar. Para o usar, todo o acesso teria de passar por um único cliente no mesmo processo. Isso é uma mudança estrutural no worker e nos serviços, e contraria o princípio de preservar o código. **Não é recomendado para a v1.** Pode ser reavaliado para uma edição "leve" sem worker concorrente.

## LF-03 — Electron 45.2.3 (Node 24.22.2 incluído)

Fluxo testado:
1. O processo principal arranca o PostgreSQL embutido.
2. Com `utilityProcess`, arranca o `server.js` do Next standalone e o worker compilado.
3. Espera pelo `/health/ready`.
4. Abre a janela em `http://127.0.0.1:47831/sign-in`.
5. Injeta um token por arranque no header `x-wcf-desktop-token`.
6. Tira uma captura de ecrã e fecha.

| Medida | Valor |
|---|---|
| Electron pronto → Postgres a correr | 40 ms |
| → Next a responder `/health/ready` 200 | 0,4 s |
| → janela carregada com a app real | **0,8 s** |
| Encerramento (worker, Next, Postgres) | ✅ limpo em 2 s, sem processos órfãos |
| Worker dentro do Electron | ✅ registou o heartbeat na base de dados durante a execução |
| `next build` standalone | ✅ 62 MB (com `.next/static` e `public`) |
| Worker e manutenção compilados com esbuild (sem `tsx`) | ✅ 7,2 MB e 5,4 MB. Correm com `node` simples |
| Electron (`dist`, sem compressão) | 259 MB |

**Estimativa do instalador macOS** (sem modelos): Electron 259 + Postgres 135 + app 62 + worker 13 ≈ **470 MB sem compressão**, cerca de 180 a 220 MB em `.dmg` comprimido (estimativa, por medir na L4).

**Consequências para L1 e L2:**
1. **URL e env:** o `NEXT_PUBLIC_APP_URL` é fixado no build. A porta tem de ser fixa por instalação, ou o URL público passa a ser lido em runtime. Recomendação: porta fixa configurável, com deteção de conflito.
2. **Regras de produção:** o `serverEnvSchema` exige HTTPS e email real com `NODE_ENV=production`. O `APP_MODE=local` tem de as substituir de forma desenhada (LF-05, LF-07). Hoje é uma exceção de spike.
3. **Token:** o header é injetado pelo Electron, mas o `proxy.ts` ainda não o valida. Fica para a L1, com teste.
4. **Migrations na app empacotada:** o spike usou o CLI do Prisma do repositório. A app instalada precisa de um executor de migrations sem o CLI do Prisma (que é pesado): aplicar os `migration.sql` por ordem e registar em `_prisma_migrations`, com `migrate:check` e backup antes. Fica para a L2.
5. **Drain do worker:** o `utilityProcess.kill()` termina o worker sem estado `draining`. O supervisor deve enviar um sinal de paragem e esperar pelo drain (até 90 s), como faz o Render.

## LF-04 — Download de modelos (`POST /api/pull` do Ollama 0.40.16)

Testado com `all-minilm:22m` (46 MB, Apache 2.0), removido no fim.

| Prova | Resultado |
|---|---|
| Progresso | ✅ Eventos por camada com `completed` e `total` (percentagem fiável) |
| Cancelamento antes de transferir bytes | ✅ Instantâneo |
| Cancelamento a meio (15,9 MB) | ✅ A ligação fecha e o Ollama guarda a parte já descarregada |
| Retoma | ✅ Continua a partir de 35%, sem recomeçar |
| Modelo já presente | ✅ Só verifica: 1 s |
| Verificação | ✅ O Ollama verifica o digest sha256 de cada camada |
| Licença | ✅ `ollama show --license` devolve o texto (Apache 2.0) para mostrar antes de ativar |

**Consequência para L3:** o catálogo fixa o digest do manifesto, e a app compara-o com `/api/tags` depois do download. Para mostrar a licença **antes** do download, ela tem de estar no manifesto do catálogo, porque o `ollama show` só funciona depois.

## Decisões a aprovar

1. **ADR L-3:** PostgreSQL embutido como persistência local. PGlite rejeitado para a v1.
2. **ADR L-2:** Electron como invólucro desktop.
3. **Mudanças para o plano das fases L1–L3:**

   | Fase | Item | Origem |
   |---|---|---|
   | L1 | Porta fixa por instalação (ou URL em runtime) | LF-03 |
   | L1 | `APP_MODE=local` desenhado nas regras do env | LF-03 |
   | L1 | Validação do token no `proxy.ts` | LF-03 |
   | L2 | Executor de migrations sem o CLI do Prisma | LF-03 |
   | L2 | Supervisor com tratamento de órfãos | LF-01 |
   | L2 | `pg_dump` incluído ou snapshots | LF-01 |
   | L2 | Drain do worker | LF-03 |
   | L3 | Licença no manifesto do catálogo | LF-04 |
   | L6 | `pgvector` por plataforma | LF-01 |

## Reproduzir

```bash
git checkout spike/l0
cd spikes/embedded-pg && pnpm install && node spike.mjs /tmp/wcf-pg 5544     # LF-01
cd ../pglite && pnpm install                                                   # LF-02 (ver os comandos acima)
cd ../electron && pnpm install && (cd node_modules/electron && node install.js)
# build da app: NEXT_OUTPUT=standalone APP_MODE=local … pnpm build; esbuild do worker (ver o README do spike)
cd ../ollama-pull && node pull.mjs all-minilm:22m 4000 && node pull.mjs all-minilm:22m   # LF-04
```
