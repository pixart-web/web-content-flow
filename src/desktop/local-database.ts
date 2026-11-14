import { Client } from "pg";

import {
  applyMigrations,
  migrationState,
  MigrationRunnerError,
  type MigrationFile,
} from "@/server/db/migration-runner";
import { unapprovedDestructiveMigrations } from "@/server/db/migration-safety";

import { createSnapshot, pruneSnapshots } from "./backups";
import {
  startPostgres,
  type PostgresOptions,
  type RunningPostgres,
} from "./postgres-supervisor";

// L2: what the desktop shell runs at launch, before the web server and the
// worker. Start PostgreSQL → check the migration history → if an existing
// workspace has pending migrations, stop, snapshot, start again → migrate.
// A fresh installation has nothing to protect, so it is not snapshotted.

export type PreparedDatabase = Readonly<{
  postgres: RunningPostgres;
  appliedNow: readonly string[];
  snapshotDir: string | null;
}>;

async function withClient<T>(url: string, run: (client: Client) => Promise<T>) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

export async function prepareLocalDatabase(input: {
  postgres: PostgresOptions;
  backupsDir: string;
  migrations: readonly MigrationFile[];
  keepPreMigrationSnapshots?: number;
}): Promise<PreparedDatabase> {
  let postgres = await startPostgres(input.postgres);
  try {
    const state = await withClient(postgres.databaseUrl, (client) =>
      migrationState(client, input.migrations),
    );
    if (state.problems.length > 0)
      throw new MigrationRunnerError(
        "The database migration history needs attention before updating.",
        state.problems,
      );
    const blocked = unapprovedDestructiveMigrations(state.pending);
    if (blocked.length > 0)
      throw new MigrationRunnerError(
        "A pending migration could lose data and is not approved.",
        blocked,
      );

    let snapshotDir: string | null = null;
    if (state.pending.length > 0 && state.applied.length > 0) {
      await postgres.stop();
      snapshotDir = createSnapshot({
        dataDir: input.postgres.dataDir,
        backupsDir: input.backupsDir,
        label: `before-${state.pending.at(-1)!.name}`,
        reason: "pre-migration",
        appliedMigrations: state.applied,
      }).dir;
      pruneSnapshots(
        input.backupsDir,
        "pre-migration",
        input.keepPreMigrationSnapshots ?? 5,
      );
      postgres = await startPostgres(input.postgres);
    }

    const { applied } = await withClient(postgres.databaseUrl, (client) =>
      applyMigrations(client, input.migrations),
    );
    return { postgres, appliedNow: applied, snapshotDir };
  } catch (error: unknown) {
    await postgres.stop().catch(() => {});
    throw error;
  }
}
