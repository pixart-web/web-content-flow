import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

import EmbeddedPostgres from "embedded-postgres";
import { Client } from "pg";

// L2 (LF-10, ADR L-3): runs the desktop edition's PostgreSQL 16 from the
// embedded binaries, in the installation's data directory, on 127.0.0.1.
// Plain Node: the Electron main process (L4) and the tests both use it.
//
// L0 finding handled here: if the supervising process dies, PostgreSQL keeps
// running as an orphan and the next start fails. startPostgres() stops such
// an orphan first, but only after checking the PID in postmaster.pid really
// is a postgres process (PIDs get reused).

const run = promisify(execFile);

export type PostgresOptions = Readonly<{
  dataDir: string;
  database: string;
  user: string;
  password: string;
  preferredPort?: number;
  log?: (message: string) => void;
}>;

export type RunningPostgres = Readonly<{
  port: number;
  databaseUrl: string;
  stop: () => Promise<void>;
}>;

// The platform binaries are a dependency of embedded-postgres, not of the
// app (pnpm keeps them private), so resolve them from its location.
function platformPackage() {
  const platform = process.platform === "win32" ? "windows" : process.platform;
  return `@embedded-postgres/${platform}-${process.arch}`;
}

export function pgCtlPath() {
  const fromEmbedded = createRequire(require.resolve("embedded-postgres"));
  const entry = fromEmbedded.resolve(platformPackage());
  const binary = process.platform === "win32" ? "pg_ctl.exe" : "pg_ctl";
  return join(dirname(entry), "..", "native", "bin", binary);
}

export function readPostmasterPid(dataDir: string): number | null {
  const file = join(dataDir, "postmaster.pid");
  if (!existsSync(file)) return null;
  const pid = Number(readFileSync(file, "utf8").split("\n")[0]);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

function isAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: unknown) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

export async function processLooksLikePostgres(pid: number) {
  try {
    if (process.platform === "win32") {
      const { stdout } = await run("tasklist", [
        "/FI",
        `PID eq ${pid}`,
        "/FO",
        "CSV",
        "/NH",
      ]);
      return /postgres\.exe/i.test(stdout);
    }
    const { stdout } = await run("ps", ["-p", String(pid), "-o", "comm="]);
    return /postgres/.test(stdout);
  } catch {
    return false;
  }
}

export type OrphanOutcome = "none" | "stale-file-removed" | "orphan-stopped";

export async function clearPreviousPostmaster(
  dataDir: string,
  log: (message: string) => void = () => {},
): Promise<OrphanOutcome> {
  const pid = readPostmasterPid(dataDir);
  if (pid === null) return "none";
  if (isAlive(pid) && (await processLooksLikePostgres(pid))) {
    log(`Stopping orphaned PostgreSQL (pid ${pid}).`);
    await run(pgCtlPath(), [
      "stop",
      "-D",
      dataDir,
      "-m",
      "fast",
      "-w",
      "-t",
      "60",
    ]);
    return "orphan-stopped";
  }
  // Dead PID, or a PID now used by another program: the lock is stale.
  rmSync(join(dataDir, "postmaster.pid"), { force: true });
  log(`Removed stale postmaster.pid (pid ${pid}).`);
  return "stale-file-removed";
}

export function portIsFree(port: number) {
  return new Promise<boolean>((resolve) => {
    const server = createServer()
      .once("error", () => resolve(false))
      .once("listening", () => server.close(() => resolve(true)))
      .listen(port, "127.0.0.1");
  });
}

export async function findFreePort(preferred: number, attempts = 50) {
  for (let port = preferred; port < preferred + attempts; port += 1)
    if (await portIsFree(port)) return port;
  throw new Error(
    `No free port between ${preferred} and ${preferred + attempts - 1}.`,
  );
}

export async function startPostgres(
  options: PostgresOptions,
): Promise<RunningPostgres> {
  const log = options.log ?? (() => {});
  mkdirSync(options.dataDir, { recursive: true });
  const fresh = !existsSync(join(options.dataDir, "PG_VERSION"));
  if (!fresh) await clearPreviousPostmaster(options.dataDir, log);
  const port = await findFreePort(options.preferredPort ?? 54_330);

  const postgres = new EmbeddedPostgres({
    databaseDir: options.dataDir,
    user: options.user,
    password: options.password,
    port,
    persistent: true,
    // Listen on loopback only; never on the network.
    postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
    onLog: () => {},
    onError: (message: unknown) => log(String(message)),
  });
  if (fresh) {
    log("Initialising the local database.");
    await postgres.initialise();
  }
  await postgres.start();

  const admin = new Client({
    host: "127.0.0.1",
    port,
    user: options.user,
    password: options.password,
    database: "postgres",
  });
  await admin.connect();
  try {
    const exists = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [options.database],
    );
    if (exists.rowCount === 0) await postgres.createDatabase(options.database);
  } finally {
    await admin.end();
  }

  const url = new URL("postgresql://127.0.0.1");
  url.port = String(port);
  url.username = options.user;
  url.password = options.password;
  url.pathname = `/${options.database}`;
  return {
    port,
    databaseUrl: url.toString(),
    stop: () => postgres.stop(),
  };
}
