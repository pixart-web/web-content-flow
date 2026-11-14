import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { unapprovedDestructiveMigrations } from "../src/server/db/migration-safety";

// Runs before `prisma migrate deploy` on Render (preDeployCommand) and in CI.
// Exit 1 blocks the deploy when a migration could lose data without approval.

const root = join(process.cwd(), "prisma", "migrations");
const migrations = readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({
    name: entry.name,
    sql: readFileSync(join(root, entry.name, "migration.sql"), "utf8"),
  }));
const blocked = unapprovedDestructiveMigrations(migrations);
if (blocked.length > 0) {
  for (const { name, statements } of blocked)
    console.error(`Blocked migration ${name}: ${statements.join(", ")}`);
  console.error(
    "Add '-- destructive-approved: <who> <date> <reason>' after review, or make the migration additive.",
  );
  process.exitCode = 1;
} else {
  console.warn(
    `Migration safety: ${migrations.length} migrations checked, none destructive.`,
  );
}
