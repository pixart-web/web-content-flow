import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  applyMigrations,
  migrationState,
  readMigrations,
  type MigrationFile,
} from "../../src/server/db/migration-runner";

// Each scenario gets a brand-new database (name contains "test"), created
// from the integration test database's server and dropped afterwards.

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) throw new Error("DATABASE_URL is required.");
const repoMigrations = readMigrations(
  join(process.cwd(), "prisma", "migrations"),
);
const created: string[] = [];

function urlFor(database: string) {
  const url = new URL(baseUrl!);
  url.pathname = `/${database}`;
  return url.toString();
}

async function admin<T>(run: (client: Client) => Promise<T>) {
  const client = new Client({ connectionString: baseUrl });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

async function freshDatabase() {
  const name = `wcf_runner_test_${Date.now()}_${created.length}`;
  await admin((client) => client.query(`CREATE DATABASE "${name}"`));
  created.push(name);
  const client = new Client({ connectionString: urlFor(name) });
  await client.connect();
  return { name, client };
}

async function columns(client: Client) {
  const { rows } = await client.query<{ c: string }>(
    `SELECT table_name || '.' || column_name || ':' || data_type || ':' || is_nullable AS c
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'
      ORDER BY 1`,
  );
  return rows.map((row) => row.c);
}

beforeAll(() => {
  expect(repoMigrations.length).toBeGreaterThan(0);
});

afterAll(async () => {
  await admin(async (client) => {
    for (const name of created)
      await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  });
});

describe("migration runner (LF-11)", () => {
  it("builds the same schema as prisma migrate deploy and Prisma accepts its history", async () => {
    const { name, client } = await freshDatabase();
    let backups = 0;
    const result = await applyMigrations(client, repoMigrations, {
      onBeforeApply: async (pending) => {
        backups += 1;
        expect(pending).toHaveLength(repoMigrations.length);
      },
    });
    expect(result.applied).toEqual(repoMigrations.map((file) => file.name));
    expect(backups).toBe(1);

    // The integration database itself was migrated by the Prisma CLI.
    const reference = await admin(columns);
    expect(await columns(client)).toEqual(reference);

    const status = execFileSync(
      "pnpm",
      ["exec", "prisma", "migrate", "status"],
      { env: { ...process.env, DATABASE_URL: urlFor(name) }, encoding: "utf8" },
    );
    expect(status).toMatch(/Database schema is up to date/);

    // Second run: nothing pending, no backup.
    expect(
      await applyMigrations(client, repoMigrations, {
        onBeforeApply: async () => {
          backups += 1;
        },
      }),
    ).toEqual({ applied: [] });
    expect(backups).toBe(1);
    await client.end();
  });

  it("applies only what is pending", async () => {
    const { client } = await freshDatabase();
    await applyMigrations(client, repoMigrations.slice(0, 3));
    const state = await migrationState(client, repoMigrations);
    expect(state.applied).toHaveLength(3);
    expect(state.pending.map((file) => file.name)).toEqual(
      repoMigrations.slice(3).map((file) => file.name),
    );
    expect(
      (await applyMigrations(client, repoMigrations)).applied,
    ).toHaveLength(repoMigrations.length - 3);
    await client.end();
  });

  it("rolls back a failing migration, records it and refuses later runs", async () => {
    const { client } = await freshDatabase();
    const broken: MigrationFile = {
      name: "29990101000000_broken",
      sql: 'CREATE TABLE "Half" (id TEXT);\nSELECT * FROM "DoesNotExist";',
      checksum: "x".repeat(64),
    };
    await expect(
      applyMigrations(client, [...repoMigrations, broken]),
    ).rejects.toThrow(/29990101000000_broken failed/);
    const half = await client.query(`SELECT to_regclass('public."Half"') AS t`);
    expect(half.rows[0].t).toBeNull();
    const state = await migrationState(client, [...repoMigrations, broken]);
    expect(state.problems).toEqual([{ name: broken.name, kind: "failed" }]);
    await expect(
      applyMigrations(client, [...repoMigrations, broken]),
    ).rejects.toThrow(/needs attention/);
    await client.end();
  });

  it("refuses unapproved destructive migrations before touching anything", async () => {
    const { client } = await freshDatabase();
    await applyMigrations(client, repoMigrations);
    const destructive: MigrationFile = {
      name: "29990102000000_drop_column",
      sql: 'ALTER TABLE "User" DROP COLUMN "name";',
      checksum: "y".repeat(64),
    };
    let backupCalled = false;
    await expect(
      applyMigrations(client, [...repoMigrations, destructive], {
        onBeforeApply: async () => {
          backupCalled = true;
        },
      }),
    ).rejects.toThrow(/could lose data/);
    expect(backupCalled).toBe(false);
    const state = await migrationState(client, [
      ...repoMigrations,
      destructive,
    ]);
    expect(state.pending.map((file) => file.name)).toEqual([destructive.name]);
    await client.end();
  });

  it("refuses edited migrations and databases newer than the app", async () => {
    const { client } = await freshDatabase();
    await applyMigrations(client, repoMigrations);
    const edited = repoMigrations.map((file, index) =>
      index === 0 ? { ...file, checksum: "z".repeat(64) } : file,
    );
    expect((await migrationState(client, edited)).problems).toEqual([
      { name: repoMigrations[0]!.name, kind: "checksum_mismatch" },
    ]);
    const older = repoMigrations.slice(0, -1);
    expect((await migrationState(client, older)).problems).toEqual([
      { name: repoMigrations.at(-1)!.name, kind: "unknown_in_database" },
    ]);
    await expect(applyMigrations(client, older)).rejects.toThrow(
      /needs attention/,
    );
    await client.end();
  });

  it("reads migrations from disk in name order with sha256 checksums", () => {
    const dir = mkdtempSync(join(tmpdir(), "wcf-migrations-"));
    for (const name of ["2_b", "1_a"]) {
      mkdirSync(join(dir, name));
      writeFileSync(join(dir, name, "migration.sql"), `-- ${name}\n`);
    }
    writeFileSync(
      join(dir, "migration_lock.toml"),
      'provider = "postgresql"\n',
    );
    const files = readMigrations(dir);
    expect(files.map((file) => file.name)).toEqual(["1_a", "2_b"]);
    expect(files[0]!.checksum).toMatch(/^[0-9a-f]{64}$/);
  });
});
