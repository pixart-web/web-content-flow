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
