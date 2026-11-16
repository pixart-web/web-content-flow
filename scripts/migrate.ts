import "./local-node-env";

import { join } from "node:path";

import { Client } from "pg";

import {
  applyMigrations,
  MigrationRunnerError,
  readMigrations,
} from "../src/server/db/migration-runner";

// L7: applies the committed migrations with the app's own runner (no Prisma
// CLI in the server image). Same rules as the desktop edition: refuses an
// edited or failed history and unapproved destructive SQL.
// Usage: node migrate.mjs [migrationsDir]   (DATABASE_URL required)

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const directory =
    process.argv[2] ?? join(process.cwd(), "prisma", "migrations");
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const { applied } = await applyMigrations(
      client,
      readMigrations(directory),
    );
    console.warn(
      JSON.stringify({
        event: "migrations.applied",
        count: applied.length,
        applied,
      }),
    );
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const details =
    error instanceof MigrationRunnerError ? error.details : undefined;
  console.error(
    JSON.stringify({
      event: "migrations.failed",
      message: error instanceof Error ? error.message : String(error),
      ...(details ? { details } : {}),
    }),
  );
  process.exitCode = 1;
});
