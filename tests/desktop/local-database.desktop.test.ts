import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Client } from "pg";
import { afterAll, describe, expect, it } from "vitest";

import {
  createSnapshot,
  listSnapshots,
  pruneSnapshots,
  restoreSnapshot,
} from "../../src/desktop/backups";
import { prepareLocalDatabase } from "../../src/desktop/local-database";
import {
  clearPreviousPostmaster,
  startPostgres,
} from "../../src/desktop/postgres-supervisor";
import {
  applyMigrations,
  readMigrations,
  type MigrationFile,
} from "../../src/server/db/migration-runner";

const migrations = readMigrations(join(process.cwd(), "prisma", "migrations"));
const roots: string[] = [];
function installation() {
  const root = mkdtempSync(join(tmpdir(), "wcf-install-"));
  roots.push(root);
  return {
    postgres: {
      dataDir: join(root, "data"),
      database: "wcf_desktop_test",
      user: "wcf",
      password: "desktop-test-password-0123456789",
    },
    backupsDir: join(root, "backups"),
  };
}

async function sql<T = Record<string, unknown>>(url: string, text: string) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return (await client.query(text)).rows as T[];
  } finally {
    await client.end();
  }
}

const finished = `SELECT count(*)::int AS n FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;

afterAll(async () => {
  for (const root of roots) {
    await clearPreviousPostmaster(join(root, "data")).catch(() => {});
    rmSync(root, { recursive: true, force: true });
  }
});

describe("local database preparation and snapshots (L2)", () => {
  it("migrates a fresh installation without a snapshot", async () => {
    const install = installation();
    const prepared = await prepareLocalDatabase({ ...install, migrations });
    expect(prepared.appliedNow).toHaveLength(migrations.length);
    expect(prepared.snapshotDir).toBeNull();
    expect(listSnapshots(install.backupsDir)).toEqual([]);
    await prepared.postgres.stop();
  });

  it("snapshots an existing workspace before migrating it, and the snapshot restores", async () => {
    const install = installation();
    // An older installation: first 3 migrations and one user.
    const older = await startPostgres(install.postgres);
    const client = new Client({ connectionString: older.databaseUrl });
    await client.connect();
    await applyMigrations(client, migrations.slice(0, 3));
    await client.query(
      `INSERT INTO "User" (id, email, "updatedAt") VALUES ('u1', 'owner@test.invalid', now())`,
    );
    await client.end();
    await older.stop();

    const prepared = await prepareLocalDatabase({ ...install, migrations });
    expect(prepared.appliedNow).toHaveLength(migrations.length - 3);
    expect(prepared.snapshotDir).not.toBeNull();
    const [snapshot] = listSnapshots(install.backupsDir);
    expect(snapshot!.manifest).toMatchObject({
      reason: "pre-migration",
      appliedMigrations: migrations.slice(0, 3).map((file) => file.name),
      postgresVersion: "16",
    });
    expect(existsSync(join(snapshot!.dir, "data", "postmaster.pid"))).toBe(
      false,
    );
    expect((await sql(prepared.postgres.databaseUrl, finished))[0]).toEqual({
      n: migrations.length,
    });
    await prepared.postgres.stop();

    // Restore: back to 3 migrations, user intact, current data kept aside.
    const restored = restoreSnapshot({
      snapshotDir: snapshot!.dir,
      dataDir: install.postgres.dataDir,
    });
    expect(restored.previousDataDir).not.toBeNull();
    expect(existsSync(restored.previousDataDir!)).toBe(true);
    const back = await startPostgres(install.postgres);
    expect((await sql(back.databaseUrl, finished))[0]).toEqual({ n: 3 });
    expect(await sql(back.databaseUrl, `SELECT email FROM "User"`)).toEqual([
      { email: "owner@test.invalid" },
    ]);
    await back.stop();
  });

  it("refuses a destructive pending migration before stopping or snapshotting", async () => {
    const install = installation();
    const first = await prepareLocalDatabase({ ...install, migrations });
    await first.postgres.stop();
    const destructive: MigrationFile = {
      name: "29990102000000_drop_column",
      sql: 'ALTER TABLE "User" DROP COLUMN "name";',
      checksum: "y".repeat(64),
    };
    await expect(
      prepareLocalDatabase({
        ...install,
        migrations: [...migrations, destructive],
      }),
    ).rejects.toThrow(/could lose data/);
    expect(listSnapshots(install.backupsDir)).toEqual([]);
    expect(existsSync(join(install.postgres.dataDir, "postmaster.pid"))).toBe(
      false,
    );
  });

  it("refuses snapshots and restores while PostgreSQL is running", async () => {
    const install = installation();
    const running = await startPostgres(install.postgres);
    expect(() =>
      createSnapshot({
        dataDir: install.postgres.dataDir,
        backupsDir: install.backupsDir,
        label: "manual",
        reason: "manual",
        appliedMigrations: [],
      }),
    ).toThrow(/must be stopped/);
    await running.stop();
  });

  it("keeps only the newest pre-migration snapshots", async () => {
    const install = installation();
    const running = await startPostgres(install.postgres);
    await running.stop();
    for (let day = 1; day <= 4; day += 1)
      createSnapshot({
        dataDir: install.postgres.dataDir,
        backupsDir: install.backupsDir,
        label: `snapshot-${day}`,
        reason: "pre-migration",
        appliedMigrations: [],
        now: new Date(`2026-11-0${day}T10:00:00Z`),
      });
    createSnapshot({
      dataDir: install.postgres.dataDir,
      backupsDir: install.backupsDir,
      label: "manual",
      reason: "manual",
      appliedMigrations: [],
      now: new Date("2026-11-01T09:00:00Z"),
    });
    expect(pruneSnapshots(install.backupsDir, "pre-migration", 2)).toHaveLength(
      2,
    );
    expect(
      listSnapshots(install.backupsDir).map((s) => s.manifest.label),
    ).toEqual(["manual", "snapshot-3", "snapshot-4"]);
    expect(
      readdirSync(install.backupsDir).some((name) => name.endsWith(".partial")),
    ).toBe(false);
  });
});
