import { describe, expect, it } from "vitest";

import {
  migrationsAreReady,
  type MigrationState,
} from "@/server/db/migration-readiness";

const complete = (name: string): MigrationState => ({
  migration_name: name,
  finished_at: new Date(),
  rolled_back_at: null,
  logs: null,
});

describe("migration readiness", () => {
  it("accepts the complete expected migration and harmless newer migrations", () => {
    expect(
      migrationsAreReady([complete("expected"), complete("newer")], "expected"),
    ).toBe(true);
  });

  it.each([
    [[{ ...complete("expected"), finished_at: null }]],
    [[{ ...complete("expected"), rolled_back_at: new Date() }]],
    [[{ ...complete("expected"), logs: "failed" }]],
    [[complete("different")]],
  ])("rejects unfinished, failed, rolled-back, or missing state", (rows) => {
    expect(migrationsAreReady(rows, "expected")).toBe(false);
  });
});
