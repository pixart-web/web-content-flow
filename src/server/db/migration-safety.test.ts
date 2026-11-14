import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  destructiveStatements,
  unapprovedDestructiveMigrations,
} from "./migration-safety";

describe("migration safety guard", () => {
  it("flags data-losing statements and ignores comments and index drops", () => {
    expect(
      destructiveStatements(`
        -- DROP TABLE "Old"; (comment only)
        DROP INDEX "ContentItem_sourceJobId_idx";
        ALTER TABLE "User" DROP COLUMN "legacy";
        ALTER TABLE "Job" ALTER COLUMN "status" SET DATA TYPE TEXT;
        TRUNCATE "Export";
      `),
    ).toEqual(["DROP COLUMN", "TRUNCATE", "column type change"]);
    expect(
      destructiveStatements('CREATE TABLE "A" (id TEXT); DROP INDEX "x";'),
    ).toEqual([]);
  });

  it("lets an explicitly approved migration through", () => {
    const sql = 'ALTER TABLE "User" DROP COLUMN "legacy";';
    expect(unapprovedDestructiveMigrations([{ name: "m1", sql }])).toEqual([
      { name: "m1", statements: ["DROP COLUMN"] },
    ]);
    expect(
      unapprovedDestructiveMigrations([
        {
          name: "m1",
          sql: `-- destructive-approved: product owner 2026-11-14 column unused since v1\n${sql}`,
        },
      ]),
    ).toEqual([]);
  });

  it("finds no unapproved destructive migration in the repository", () => {
    const root = join(process.cwd(), "prisma", "migrations");
    const migrations = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        sql: readFileSync(join(root, entry.name, "migration.sql"), "utf8"),
      }));
    expect(migrations.length).toBeGreaterThan(0);
    expect(unapprovedDestructiveMigrations(migrations)).toEqual([]);
  });
});
