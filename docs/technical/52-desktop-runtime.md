# Desktop runtime — base de dados, migrations e backups (L2)

**Data:** 2026-11-14 · **Código:** `src/desktop/`, `src/server/db/migration-runner.ts` · **Testes:** `pnpm test:desktop` (PostgreSQL real), `pnpm test:integration` · **Arquitetura:** [49](49-local-first-architecture-proposal.md) (ADR L-3), resultados da L0 em [51](51-l0-spike-results.md)

O código é Node simples. O processo principal do Electron (L4) chama-o diretamente, e os testes também.

## Sequência de arranque (o que o invólucro faz)

```
prepareLocalDatabase({ postgres, backupsDir, migrations })
  1. startPostgres          initdb no 1.º arranque · pára um postgres órfão · 127.0.0.1 · porta livre
  2. migrationState         recusa: histórico com falha, migration editada, base mais recente do que a app
  3. guarda destrutiva      recusa SQL que perde dados sem "-- destructive-approved:"
  4. se há pendentes numa base com dados:
        stop → createSnapshot("pre-migration") → pruneSnapshots(5) → startPostgres
  5. applyMigrations        uma transação por migration, registo compatível com a Prisma
→ { postgres.databaseUrl, appliedNow, snapshotDir }
```

Depois disto, o invólucro arranca o servidor web e o worker do `pnpm build:desktop` (L1) com o `DATABASE_URL` devolvido.

| Peça | Ficheiro | Notas |
|---|---|---|
| Supervisor do PostgreSQL | `src/desktop/postgres-supervisor.ts` | `embedded-postgres` 16.15. Escuta só em 127.0.0.1. Só para um órfão depois de confirmar que o PID é mesmo o postgres |
| Executor de migrations | `src/server/db/migration-runner.ts` | Sem CLI da Prisma. Grava a mesma `_prisma_migrations` (checksum sha256), por isso é intercambiável com `prisma migrate deploy` |
| Guarda destrutiva | `src/server/db/migration-safety.ts` | Também no CI (`pnpm migrate:check`) |
| Snapshots | `src/desktop/backups.ts` | Cópia do diretório de dados **com o PostgreSQL parado**. Grava `manifest.json` e termina com um rename atómico (`.partial`) |
| Orquestração | `src/desktop/local-database.ts` | `prepareLocalDatabase()` |

## Diretórios de uma instalação

```
<userData>/WebContentFlow/
  data/                  PostgreSQL 16 (PG_VERSION, …)
  backups/<data>-<label>/  data/ + manifest.json
  data.before-restore-<data>/   o que existia antes de um restauro (nunca apagado automaticamente)
```

## Restauro

`restoreSnapshot({ snapshotDir, dataDir })` exige o PostgreSQL parado e a mesma versão major. Move os dados atuais para `data.before-restore-…` e copia o snapshot. Um restauro errado pode, por isso, ser ele próprio desfeito.

## Limitações conhecidas (para fases seguintes)

- **Sem `pg_dump`** nos binários. Os snapshots servem para a mesma plataforma e a mesma versão major. Para mudar de SO ou para um servidor privado usa-se o pacote de workspace (secção seguinte).
- **Tamanho:** um workspace vazio e migrado ocupa cerca de 70 MB por snapshot. Compressão e agendamento ficam para a L4 (UI de backups).
- **Credenciais:** a password do PostgreSQL local, o `AUTH_SECRET`, o `RATE_LIMIT_SECRET` e os tokens do desktop são gerados no primeiro arranque e guardados no keychain pelo invólucro (L4). Este código recebe-os como parâmetros.

## Pacote de workspace (LF-12, 2026-11-20)

Exportação lógica de todos os projetos do dono, independente do SO, da versão do PostgreSQL e da instalação. Em **Settings → Workspace** (web, desktop e servidor privado).

- **Formato:** um ficheiro `web-content-flow-workspace-AAAA-MM-DD.json.gz`, JSON comprimido com gzip. Cabeçalho `format: "web-content-flow.workspace"`, `formatVersion: 1`, `appRelease`, `databaseMigration`. Schema em `src/server/workspace/workspace-package-schema.ts`.
- **Inclui, por projeto:** projeto, módulos, Brief, Brand Profile com todas as versões, conteúdos com todas as versões, histórico de jobs (com passos) e registos de uso, documentos de conhecimento com os excertos e os embeddings (Float32 em base64). Não é preciso reindexar.
- **Não inclui:** conta, password, sessões, tokens, contas OAuth, rate limits, exportações, reservas de uso, heartbeats, inscrições beta. O email do dono e o seu ID também não entram: as autorias passam a `byOwner`.
- **Exportação:** recusada enquanto houver gerações em curso (estados não terminais), para não levar jobs a meio. Os campos de lease nunca viajam.
- **Importação:** valida o ficheiro inteiro antes de escrever: zod estrito, todas as referências internas apontam para registos do mesmo projeto, IDs sem duplicados, no máximo 512 MB descomprimidos (contra bombas gzip) e 64 MB de upload. Depois cria **projetos novos com IDs novos**, numa única transação. Nada do que já existe é alterado; importar no mesmo workspace cria uma cópia. Se algo falhar, nada fica escrito.
  - Os IDs de excertos em `provenance.knowledgeChunkIds` e o `scopeId` dos jobs são reescritos para os novos IDs. O `request` dos jobs antigos fica como estava (é só histórico).
  - Conta para o limite de projetos do plano.
  - Um pacote de uma versão mais nova da app é recusado com uma mensagem própria.
- **Rotas:** `POST /api/workspace/package` (descarrega) e `POST /api/workspace/package/import` (corpo = o ficheiro). A importação exige `Origin` igual ao da app. Ambas: sessão, 5 pedidos por minuto, flag `workspacePackageEnabled` (`EXPORTS_ENABLED` e `PROJECT_PACKAGE_EXPORT_ENABLED`, fora de manutenção).
- **Next:** com o proxy (`src/proxy.ts`), o Next corta os corpos aos 10 MB. `proxyClientMaxBodySize` passou a 64 MB em `next.config.ts`.
- **Testes:** `tests/integration/workspace-package.integration.test.ts` (ida e volta para outro dono, cópia no mesmo dono, ficheiros danificados/estranhos/mais novos, limite do plano, recusa com job em curso). Verificado no browser com os dados demo: 1 projeto, 32 conteúdos, 45 versões, 13 jobs; os editores abrem a cópia com o histórico.
- **Ainda não:** importar seletivamente um projeto, e um teste de ida e volta entre SOs diferentes no CI (o formato não depende do SO, mas não está provado lá).

## Invólucro Electron (L4a)

`src/desktop/shell/main.ts` é o processo principal. O `pnpm build:desktop` gera `dist/desktop/main.mjs` com as migrations e o pacote de binários do PostgreSQL ao lado, e `pnpm desktop:start` abre a app (sem assinatura, para teste).

| Passo | Detalhe |
|---|---|
| Segredos | `AUTH_SECRET`, `RATE_LIMIT_SECRET` e a password do PostgreSQL são gerados no 1.º arranque e cifrados com `safeStorage` (Keychain do macOS) em `secrets.bin` (0600) |
| Tokens | `DESKTOP_TOKEN` (janela) e `DESKTOP_ADMIN_TOKEN` (só no processo principal), novos a cada arranque e nunca gravados |
| Base de dados | `prepareLocalDatabase()`: snapshot antes de migrar uma base com dados |
| Processos | `utilityProcess`: `web/server.js`, `worker.mjs` e `maintenance.mjs` (no arranque e de hora a hora). Logs em `logs/desktop.log` |
| Janela | `contextIsolation`, `sandbox`, sem Node. Token injetado só nos pedidos a `http://127.0.0.1:47831`. Links externos abrem no browser |
| IA | `settings.json`: só uma ativação registada e aprovada liga o modo `LOCAL` |
| Encerramento | drain do worker (até 90 s) → servidor → PostgreSQL |

Diretório de dados no macOS: `~/Library/Application Support/web-content-flow-desktop/` (o nome do pacote; o nome final do produto fica para a L4d).

## Empacotamento macOS (L4d)

`pnpm desktop:dmg` = `pnpm build:desktop` + `scripts/package-macos.mjs`:

1. copia o `Electron.app` 45.2.3 e muda o nome e o identificador (`com.webcontentflow.desktop`);
2. copia `dist/desktop` para `Contents/Resources/app` com `ditto` (mantém symlinks e permissões);
3. assinatura **ad-hoc** (obrigatória em Apple Silicon) e `codesign --verify`;
4. `.dmg` com `hdiutil` (UDZO), com atalho para Aplicações.

| Medida (arm64) | Valor |
|---|---|
| `.dmg` | ≈ 239 MB |
| App instalada | ≈ 462 MB (Electron 253 MB, app 209 MB: servidor 58 MB, PostgreSQL 136 MB depois de remover duplicados) |
| Modelos | descarregados à parte pelo assistente (gemma4 ≈ 7,2 GB) |

- O electron-builder foi experimentado e abandonado: incluía todas as dependências do repositório (839 MB) e cortava o `node_modules` do servidor standalone.
- **Sem assinatura Apple nem notarização:** um `.dmg` descarregado da internet fica em quarentena e o macOS pede "Abrir" com o botão direito. Para distribuir é preciso uma conta Apple Developer (Developer ID + notarização). As atualizações automáticas também dependem disso.
- A pasta de dados da app instalada é `~/Library/Application Support/Web Content Flow/`.

## Windows e Linux (L5)

O workflow `.github/workflows/desktop.yml` corre em **Linux (x64), Windows (x64) e macOS (arm64)**. Em cada sistema faz o build nativo (Next, argon2, sharp e PostgreSQL têm binários por plataforma), corre o `pnpm test:desktop`, abre a app Electron real duas vezes (`scripts/desktop-smoke.mjs`: 1.º e 2.º arranque, encerramento limpo) e gera os pacotes sem assinatura como artefactos (14 dias):

| Sistema | Pacote | Script |
|---|---|---|
| macOS | `.dmg` | `scripts/package-macos.mjs` |
| Linux | `.tar.gz` e `.deb` (com `chrome-sandbox` setuid no `postinst`) | `scripts/package-linux.mjs` |
| Windows | `.zip` portátil | `scripts/package-windows.mjs` |

Diferenças por sistema encontradas e corrigidas no CI:

- **Windows:** o PostgreSQL é arrancado e parado com o `pg_ctl`, que larga os privilégios de administrador (o PostgreSQL recusa correr elevado). É lançado sem pipes herdadas (senão o arranque nunca terminava) e com log em `postgres.log`.
- **Windows:** os processos filhos precisam da `SystemRoot` e das outras variáveis do SO. Sem elas, o Winsock não inicializa (`10108`) e o servidor não abre a porta (`withSystemEnv`).
- **Todos:** `initdb --encoding=UTF8 --no-locale`, porque o Windows escolhia `WIN1252`. A base de dados é criada com o cliente `pg`.
- **Build em Windows:** o `pnpm` é um `.cmd` e precisa de shell. Os duplicados do PostgreSQL ficam como cópias, porque os symlinks exigem privilégios.
- **Linux:** o `safeStorage` precisa de um keyring (GNOME Keyring ou KWallet). No CI é usado o `gnome-keyring` com `xvfb`. Uma execução falhou de forma intermitente nesse passo; a seguir.

### O que falta

- **Reposição da password em Windows e Linux (L8, feito):** o sistema confirma o utilizador na sua própria janela antes de a password mudar, e a password do sistema nunca chega à app (`src/desktop/shell/os-auth.ts`).
  - **Windows:** Windows Hello (PIN, rosto ou impressão digital), via Windows PowerShell e `UserConsentVerifier`, sem helper nativo. Sem Windows Hello configurado, a resposta é `unavailable` e a app explica como configurar um PIN.
  - **Linux:** polkit, com a ação própria `com.webcontentflow.desktop.reset-owner-password` (`auth_self`: a password da própria conta, só na sessão ativa). O `.deb` instala a regra em `/usr/share/polkit-1/actions/`. O `.tar.gz` não a instala e responde `unavailable`; nunca se usa uma ação genérica de administrador.
  - **Por confirmar por uma pessoa:** o diálogo real em Windows e Linux. O CI verifica que o script do Windows Hello carrega e lê a disponibilidade, e que o polkit aceita a regra.
- **Hardware real:** o CI não tem GPU nem Ollama. A IA local em Windows e Linux (CUDA, CPU) ainda não foi testada.
- **Assinatura:** um certificado de assinatura de código para Windows evita o aviso do SmartScreen. Linux não precisa.
- **Instaladores:** um instalador NSIS ou MSI (atalhos, desinstalação) e um AppImage ficam para depois do `.zip` e do `.deb`.

## Teste E2E da app desktop (LF-21, 2026-11-20)

`pnpm test:desktop:e2e`, depois de `pnpm build:desktop`. O Playwright (já usado no E2E web; não instala browsers) abre o Electron com o mesmo `dist/desktop` que os pacotes levam, numa pasta de dados descartável (`playwright.desktop.config.ts`, `tests/desktop-e2e/`).

O teste segue o percurso do dono em dois arranques:

1. **1.º arranque:** "Set up this computer" → onboarding → projeto → Brand Profile e copy de base gerados pelo worker (fornecedor mock) → Library → exportação do pacote de workspace (espera que os jobs acabem; antes disso a rota responde 409, como deve).
2. **2.º arranque:** os segredos são lidos, não há migrations por aplicar, a sessão ou o login levam ao projeto, e a app pára de forma limpa nas duas vezes.

**Sem rede:** com `WCF_DESKTOP_OFFLINE_GUARD` (só em builds de desenvolvimento; ignorada na app empacotada, como os outros ganchos de teste do `main.ts`), o invólucro:

- carrega um guarda CommonJS no processo principal e, por `NODE_OPTIONS`, no servidor, no worker e na manutenção (o `utilityProcess` ignora `--require` em `execArgv`). O guarda recusa e regista qualquer ligação TCP ou pesquisa DNS que não seja para `127.0.0.1`, `::1` ou `localhost`;
- cancela e regista os pedidos da janela que não sejam para este computador (`src/desktop/shell/offline.ts`).

O teste falha se houver uma única ligação recusada fora das sondas que ele próprio faz. Para não confundir "zero ligações" com "o guarda não correu", verifica também que os quatro processos carregaram o guarda e que as sondas (fetch na página, fetch no processo principal e navegação numa janela escondida) são recusadas e registadas.

- **macOS:** o teste usa `--use-mock-keychain`. Com o Porta-chaves real, o sistema pede autorização a quem está ao computador e o arranque fica parado.
- **CI:** corre no workflow Desktop em Linux (xvfb + gnome-keyring), Windows e macOS, a seguir ao smoke. O trace do Playwright fica como artefacto quando falha.
- **Ainda não coberto:** a rede física desligada (o guarda substitui-a ao nível dos processos da app; ligações do próprio Chromium fora da sessão, como verificações de componentes, não passam por ele), a app empacotada assinada (os ganchos de teste estão desligados nela de propósito), a IA local com Ollama (o CI não tem modelo; o teste usa o mock), e fechar a app a meio de um job.
