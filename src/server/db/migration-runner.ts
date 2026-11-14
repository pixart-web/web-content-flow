import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { Client } from "pg";

import { unapprovedDestructiveMigrations } from "./migration-safety";

// L2 (LF-11): applies prisma/migrations without the Prisma CLI, for the
// desktop edition where shipping the CLI and its engines is not worth it.
// It writes the same `_prisma_migrations` rows as `prisma migrate deploy`
// (checksum = sha256 of migration.sql), so either tool can take over.
//
// Order of operations: lock → read state → refuse on problems → refuse
// unapproved destructive SQL → onBeforeApply (backup) → apply each pending
// migration in its own transaction. A failure rolls back that migration,
// records its error in `logs` (like Prisma) and stops; later runs refuse
// until it is resolved.

export type MigrationFile = Readonly<{
  name: string;
  sql: string;
  checksum: string;
}>;

export type MigrationProblem = Readonly<{
  name: string;
  kind: "checksum_mismatch" | "failed" | "unknown_in_database";
}>;

export type MigrationState = Readonly<{
  applied: readonly string[];
  pending: readonly MigrationFile[];
  problems: readonly MigrationProblem[];
}>;

export class MigrationRunnerError extends Error {
  constructor(
    message: string,
    readonly details: unknown = undefined,
  ) {
    super(message);
    this.name = "MigrationRunnerError";
  }
}

// Same DDL as Prisma's own migrations table.
const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" VARCHAR(36) PRIMARY KEY NOT NULL,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
)`;

// Arbitrary constant: one runner at a time per database.
const RUNNER_LOCK = 7_210_011;

export function checksumOf(sql: string) {
  return createHash("sha256").update(sql).digest("hex");
}

export function readMigrations(directory: string): MigrationFile[] {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((name) => {
      const sql = readFileSync(join(directory, name, "migration.sql"), "utf8");
      return { name, sql, checksum: checksumOf(sql) };
    });
}

type Row = {
  migration_name: string;
  checksum: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
};

export async function migrationState(
  client: Client,
  files: readonly MigrationFile[],
): Promise<MigrationState> {
  await client.query(CREATE_TABLE);
  const { rows } = await client.query<Row>(
    `SELECT migration_name, checksum, finished_at, rolled_back_at
       FROM "_prisma_migrations" ORDER BY started_at`,
  );
  const live = rows.filter((row) => row.rolled_back_at === null);
  const byName = new Map(files.map((file) => [file.name, file]));
  const problems: MigrationProblem[] = [];
  const applied: string[] = [];
  for (const row of live) {
    const file = byName.get(row.migration_name);
    if (!file)
      problems.push({ name: row.migration_name, kind: "unknown_in_database" });
    else if (row.finished_at === null)
      problems.push({ name: row.migration_name, kind: "failed" });
    else if (row.checksum !== file.checksum)
      problems.push({ name: row.migration_name, kind: "checksum_mismatch" });
    else applied.push(row.migration_name);
  }
  const done = new Set(live.map((row) => row.migration_name));
  return {
    applied,
    pending: files.filter((file) => !done.has(file.name)),
    problems,
  };
}

export async function applyMigrations(
  client: Client,
  files: readonly MigrationFile[],
  options: {
    onBeforeApply?: (pending: readonly MigrationFile[]) => Promise<void>;
  } = {},
): Promise<{ applied: string[] }> {
  await client.query("SELECT pg_advisory_lock($1)", [RUNNER_LOCK]);
  try {
    const state = await migrationState(client, files);
    if (state.problems.length > 0)
      throw new MigrationRunnerError(
        "The database migration history needs attention before updating.",
        state.problems,
      );
    if (state.pending.length === 0) return { applied: [] };
    const blocked = unapprovedDestructiveMigrations(state.pending);
    if (blocked.length > 0)
      throw new MigrationRunnerError(
        "A pending migration could lose data and is not approved.",
        blocked,
      );
    await options.onBeforeApply?.(state.pending);

    const applied: string[] = [];
    for (const file of state.pending) {
      const id = randomUUID();
      await client.query(
        `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, applied_steps_count)
         VALUES ($1, $2, $3, now(), 0)`,
        [id, file.checksum, file.name],
      );
      try {
        await client.query("BEGIN");
        await client.query(file.sql);
        await client.query(
          `UPDATE "_prisma_migrations"
              SET finished_at = now(), applied_steps_count = 1
            WHERE id = $1`,
          [id],
        );
        await client.query("COMMIT");
      } catch (error: unknown) {
        await client.query("ROLLBACK");
        const message = error instanceof Error ? error.message : String(error);
        await client.query(
          `UPDATE "_prisma_migrations" SET logs = $2 WHERE id = $1`,
          [id, message],
        );
        throw new MigrationRunnerError(`Migration ${file.name} failed.`, {
          name: file.name,
          message,
        });
      }
      applied.push(file.name);
    }
    return { applied };
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [RUNNER_LOCK]);
  }
}
