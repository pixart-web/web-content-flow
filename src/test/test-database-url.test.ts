import { describe, expect, it } from "vitest";

import { resolveDestructiveTestDatabaseUrl } from "./test-database-url";

const testUrl = "postgresql://u:p@localhost:5432/web_content_flow_test";
const devUrl = "postgresql://u:p@localhost:5432/web_content_flow";

describe("destructive test database guard", () => {
  it("prefers TEST_DATABASE_URL over DATABASE_URL", () => {
    expect(
      resolveDestructiveTestDatabaseUrl({
        TEST_DATABASE_URL: testUrl,
        DATABASE_URL: devUrl,
      }),
    ).toBe(testUrl);
  });

  it("accepts a DATABASE_URL whose database name contains test", () => {
    expect(resolveDestructiveTestDatabaseUrl({ DATABASE_URL: testUrl })).toBe(
      testUrl,
    );
  });

  it("refuses a development database", () => {
    expect(() =>
      resolveDestructiveTestDatabaseUrl({ DATABASE_URL: devUrl }),
    ).toThrow(/Refusing to run destructive tests/);
  });

  it("allows an explicit override", () => {
    expect(
      resolveDestructiveTestDatabaseUrl({
        DATABASE_URL: devUrl,
        ALLOW_DESTRUCTIVE_TEST_DATABASE: "true",
      }),
    ).toBe(devUrl);
  });

  it("requires a database URL", () => {
    expect(() => resolveDestructiveTestDatabaseUrl({})).toThrow(
      /TEST_DATABASE_URL/,
    );
  });
});
