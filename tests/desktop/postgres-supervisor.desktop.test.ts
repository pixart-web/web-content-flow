import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Client } from "pg";
import { afterAll, describe, expect, it } from "vitest";

import {
  clearPreviousPostmaster,
  findFreePort,
  processLooksLikePostgres,
  readPostmasterPid,
  startPostgres,
} from "../../src/desktop/postgres-supervisor";
import {
  applyMigrations,
  readMigrations,
} from "../../src/server/db/migration-runner";

const dirs: string[] = [];
const password = "desktop-test-password-0123456789";
function dataDir() {
  const dir = mkdtempSync(join(tmpdir(), "wcf-pg-"));
  dirs.push(dir);
  return join(dir, "data");
}
const options = (dir: string) => ({
  dataDir: dir,
  database: "wcf_desktop_test",
  user: "wcf",
  password,
});

async function query(databaseUrl: string, sql: string) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    return (await client.query(sql)).rows;
  } finally {
    await client.end();
  }
}

afterAll(async () => {
  // Stop anything a failed test left running before deleting its directory.
  for (const dir of dirs) {
    await clearPreviousPostmaster(join(dir, "data")).catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("embedded PostgreSQL supervisor (LF-10)", () => {
  it("initialises, migrates, stops and restarts with the data intact", async () => {
    const dir = dataDir();
    const first = await startPostgres(options(dir));
    expect(first.databaseUrl).toMatch(
      /^postgresql:\/\/wcf:.+@127\.0\.0\.1:\d+\/wcf_desktop_test$/,
    );
    const client = new Client({ connectionString: first.databaseUrl });
    await client.connect();
    const migrations = readMigrations(
      join(process.cwd(), "prisma", "migrations"),
    );
    expect((await applyMigrations(client, migrations)).applied).toHaveLength(
      migrations.length,
    );
    await client.end();
    const listen = await query(first.databaseUrl, "SHOW listen_addresses");
    expect(listen[0].listen_addresses).toBe("127.0.0.1");
    await first.stop();
    expect(readPostmasterPid(dir)).toBeNull();

    const started = performance.now();
    const second = await startPostgres(options(dir));
    expect(performance.now() - started).toBeLessThan(15_000);
    const rows = await query(
      second.databaseUrl,
      'SELECT count(*)::int AS n FROM "_prisma_migrations" WHERE finished_at IS NOT NULL',
    );
    expect(rows[0].n).toBe(migrations.length);
    await second.stop();
  });

  it("stops an orphaned PostgreSQL left by a killed supervisor", async () => {
    const dir = dataDir();
    const child = spawn(
      process.execPath,
      [
        "--import",
        "tsx",
        join("tests", "desktop", "start-postgres-child.ts"),
        dir,
        password,
      ],
      { stdio: ["ignore", "inherit", "pipe"] },
    );
    await new Promise<void>((resolve, reject) => {
      child.stderr.on("data", (chunk: Buffer) => {
        if (chunk.toString().includes("READY")) resolve();
      });
      child.once("exit", (code) => reject(new Error(`child exited ${code}`)));
    });
    child.kill("SIGKILL");
    await new Promise((resolve) => child.once("exit", resolve));

    const orphan = readPostmasterPid(dir);
    expect(orphan).not.toBeNull();
    expect(await processLooksLikePostgres(orphan!)).toBe(true);

    const running = await startPostgres(options(dir));
    expect(readPostmasterPid(dir)).not.toBe(orphan);
    expect((await query(running.databaseUrl, "SELECT 1 AS ok"))[0].ok).toBe(1);
    await running.stop();
  });

  it("removes a stale postmaster.pid whose PID is not PostgreSQL", async () => {
    const dir = dataDir();
    const running = await startPostgres(options(dir));
    await running.stop();
    // process.pid is alive but is this test runner, not postgres.
    writeFileSync(join(dir, "postmaster.pid"), `${process.pid}\n${dir}\n`);
    expect(await clearPreviousPostmaster(dir)).toBe("stale-file-removed");
    expect(readPostmasterPid(dir)).toBeNull();
    const again = await startPostgres(options(dir));
    await again.stop();
  });

  it("moves to the next free port when the preferred one is taken", async () => {
    const preferred = await findFreePort(55_400);
    const blocker: Server = createServer().listen(preferred, "127.0.0.1");
    await new Promise((resolve) => blocker.once("listening", resolve));
    try {
      const running = await startPostgres({
        ...options(dataDir()),
        preferredPort: preferred,
      });
      expect(running.port).toBeGreaterThan(preferred);
      await running.stop();
    } finally {
      blocker.close();
    }
  });
});
