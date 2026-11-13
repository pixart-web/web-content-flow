// Integration and worker suites truncate and rewrite tables. Point them at a
// dedicated database so running them never wipes local development data.
//
// - TEST_DATABASE_URL, when set, replaces DATABASE_URL for the whole run.
// - The database name must contain "test" unless
//   ALLOW_DESTRUCTIVE_TEST_DATABASE=true is set explicitly.

export function resolveDestructiveTestDatabaseUrl(
  env: Record<string, string | undefined>,
): string {
  const url = env.TEST_DATABASE_URL || env.DATABASE_URL;
  if (!url)
    throw new Error(
      "Set TEST_DATABASE_URL (or DATABASE_URL) to a dedicated test database.",
    );
  let databaseName: string;
  try {
    databaseName = decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  } catch {
    throw new Error("The test database URL is not a valid URL.");
  }
  if (
    !/test/i.test(databaseName) &&
    env.ALLOW_DESTRUCTIVE_TEST_DATABASE !== "true"
  )
    throw new Error(
      `Refusing to run destructive tests against database "${databaseName}". ` +
        'Use TEST_DATABASE_URL with a database whose name contains "test", ' +
        "or set ALLOW_DESTRUCTIVE_TEST_DATABASE=true.",
    );
  return url;
}
