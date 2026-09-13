import { EXPECTED_DATABASE_MIGRATION } from "./expected-migration";

export type MigrationState = Readonly<{
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
  logs: string | null;
}>;

export function migrationsAreReady(
  migrations: readonly MigrationState[],
  expectedMigration: string = EXPECTED_DATABASE_MIGRATION,
) {
  const expected = migrations.find(
    (migration) => migration.migration_name === expectedMigration,
  );
  return (
    Boolean(expected?.finished_at) &&
    !expected?.rolled_back_at &&
    migrations.every(
      (migration) =>
        Boolean(migration.finished_at) &&
        !migration.rolled_back_at &&
        !migration.logs,
    )
  );
}
