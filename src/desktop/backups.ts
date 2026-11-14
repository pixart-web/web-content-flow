import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

// L2 (LF-12): snapshot backups of the desktop edition's PostgreSQL data
// directory. The embedded binaries ship without pg_dump, so a snapshot is a
// copy of the data directory taken while PostgreSQL is STOPPED (the caller
// guarantees it). A snapshot restores on the same PostgreSQL major version and
// platform; moving a workspace to another OS needs the logical export
// planned for later.

export type SnapshotManifest = Readonly<{
  format: 1;
  label: string;
  reason: "manual" | "pre-migration";
  createdAt: string;
  postgresVersion: string;
  appliedMigrations: readonly string[];
  bytes: number;
}>;

export type Snapshot = Readonly<{ dir: string; manifest: SnapshotManifest }>;

// Runtime files that must not travel with a snapshot.
const SKIP = new Set(["postmaster.pid", "postmaster.opts"]);

function sizeOf(path: string): number {
  const stats = statSync(path);
  if (!stats.isDirectory()) return stats.size;
  return readdirSync(path).reduce(
    (total, name) => total + sizeOf(join(path, name)),
    0,
  );
}

function postgresVersion(dataDir: string) {
  return readFileSync(join(dataDir, "PG_VERSION"), "utf8").trim();
}

export function assertStopped(dataDir: string) {
  if (existsSync(join(dataDir, "postmaster.pid")))
    throw new Error("PostgreSQL must be stopped for a snapshot or a restore.");
}

export function createSnapshot(input: {
  dataDir: string;
  backupsDir: string;
  label: string;
  reason: SnapshotManifest["reason"];
  appliedMigrations: readonly string[];
  now?: Date;
}): Snapshot {
  assertStopped(input.dataDir);
  const createdAt = (input.now ?? new Date()).toISOString();
  const safeLabel = input.label.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);
  const dir = join(
    input.backupsDir,
    `${createdAt.replaceAll(":", "-")}-${safeLabel}`,
  );
  mkdirSync(input.backupsDir, { recursive: true });
  const partial = `${dir}.partial`;
  cpSync(input.dataDir, join(partial, "data"), {
    recursive: true,
    filter: (source) => !SKIP.has(source.split(/[\\/]/).pop() ?? ""),
  });
  const manifest: SnapshotManifest = {
    format: 1,
    label: input.label,
    reason: input.reason,
    createdAt,
    postgresVersion: postgresVersion(input.dataDir),
    appliedMigrations: [...input.appliedMigrations],
    bytes: sizeOf(join(partial, "data")),
  };
  writeFileSync(
    join(partial, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  // Rename last, so an interrupted copy never looks like a valid snapshot.
  renameSync(partial, dir);
  return { dir, manifest };
}

export function listSnapshots(backupsDir: string): Snapshot[] {
  if (!existsSync(backupsDir)) return [];
  return readdirSync(backupsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.endsWith(".partial"))
    .map((entry) => join(backupsDir, entry.name))
    .filter((dir) => existsSync(join(dir, "manifest.json")))
    .map((dir) => ({
      dir,
      manifest: JSON.parse(
        readFileSync(join(dir, "manifest.json"), "utf8"),
      ) as SnapshotManifest,
    }))
    .sort((a, b) => a.manifest.createdAt.localeCompare(b.manifest.createdAt));
}

// Keeps the newest `keep` snapshots of a reason; returns what was removed.
export function pruneSnapshots(
  backupsDir: string,
  reason: SnapshotManifest["reason"],
  keep: number,
) {
  const matching = listSnapshots(backupsDir).filter(
    (snapshot) => snapshot.manifest.reason === reason,
  );
  const removed = matching.slice(0, Math.max(0, matching.length - keep));
  for (const snapshot of removed)
    rmSync(snapshot.dir, { recursive: true, force: true });
  return removed.map((snapshot) => snapshot.dir);
}

// Replaces the data directory with a snapshot. The current data is moved
// aside (never deleted) so a wrong restore can itself be undone.
export function restoreSnapshot(input: {
  snapshotDir: string;
  dataDir: string;
  now?: Date;
}) {
  assertStopped(input.dataDir);
  const source = join(input.snapshotDir, "data");
  const manifest = JSON.parse(
    readFileSync(join(input.snapshotDir, "manifest.json"), "utf8"),
  ) as SnapshotManifest;
  if (
    existsSync(join(input.dataDir, "PG_VERSION")) &&
    postgresVersion(input.dataDir) !== manifest.postgresVersion
  )
    throw new Error(
      `Snapshot is PostgreSQL ${manifest.postgresVersion}; this installation runs ${postgresVersion(input.dataDir)}.`,
    );
  const stamp = (input.now ?? new Date()).toISOString().replaceAll(":", "-");
  const previous = existsSync(input.dataDir)
    ? `${input.dataDir}.before-restore-${stamp}`
    : null;
  if (previous) renameSync(input.dataDir, previous);
  cpSync(source, input.dataDir, { recursive: true });
  return { previousDataDir: previous, manifest };
}
