import { readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { EXPECTED_DATABASE_MIGRATION } from "./expected-migration";

describe("expected database migration", () => {
  it("is the latest committed Prisma migration", () => {
    const migrations = readdirSync(join(process.cwd(), "prisma/migrations"), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(EXPECTED_DATABASE_MIGRATION).toBe(migrations.at(-1));
  });
});
