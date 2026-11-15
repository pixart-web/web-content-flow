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

- **Sem `pg_dump`** nos binários. Os snapshots servem para a mesma plataforma e a mesma versão major. Mudar um workspace de SO, ou para um servidor privado, precisa de uma exportação lógica (pacote de workspace), ainda por fazer.
- **Tamanho:** um workspace vazio e migrado ocupa cerca de 70 MB por snapshot. Compressão e agendamento ficam para a L4 (UI de backups).
- **Credenciais:** a password do PostgreSQL local, o `AUTH_SECRET`, o `RATE_LIMIT_SECRET` e os tokens do desktop são gerados no primeiro arranque e guardados no keychain pelo invólucro (L4). Este código recebe-os como parâmetros.

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

- **Reposição da password em Windows e Linux:** o helper de confirmação só existe para macOS. Nos outros sistemas a reposição responde `unavailable`. Falta o equivalente com Windows Hello ou polkit.
- **Hardware real:** o CI não tem GPU nem Ollama. A IA local em Windows e Linux (CUDA, CPU) ainda não foi testada.
- **Assinatura:** um certificado de assinatura de código para Windows evita o aviso do SmartScreen. Linux não precisa.
- **Instaladores:** um instalador NSIS ou MSI (atalhos, desinstalação) e um AppImage ficam para depois do `.zip` e do `.deb`.
