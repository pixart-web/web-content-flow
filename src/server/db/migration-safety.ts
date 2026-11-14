// Deploy guard: `prisma migrate deploy` runs on every staging/production deploy
// (Render preDeployCommand). A migration that can lose data must say so
// explicitly, with a reviewed marker, before it can run there:
//   -- destructive-approved: <who> <date> <reason>
// Index drops and constraint changes are not data loss and pass.

export const DESTRUCTIVE_PATTERNS: readonly {
  label: string;
  pattern: RegExp;
}[] = [
  { label: "DROP TABLE", pattern: /\bDROP\s+TABLE\b/i },
  { label: "DROP COLUMN", pattern: /\bDROP\s+COLUMN\b/i },
  { label: "DROP SCHEMA", pattern: /\bDROP\s+SCHEMA\b/i },
  { label: "DROP TYPE", pattern: /\bDROP\s+TYPE\b/i },
  { label: "TRUNCATE", pattern: /\bTRUNCATE\b/i },
  { label: "DELETE FROM", pattern: /\bDELETE\s+FROM\b/i },
  {
    label: "column type change",
    pattern: /\bALTER\s+COLUMN\s+\S+\s+(SET\s+DATA\s+)?TYPE\b/i,
  },
  { label: "RENAME", pattern: /\bRENAME\s+(COLUMN|TO)\b/i },
];

const APPROVAL = /^--\s*destructive-approved:\s*\S.+$/im;

export function destructiveStatements(sql: string) {
  const code = sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
  return DESTRUCTIVE_PATTERNS.filter(({ pattern }) => pattern.test(code)).map(
    ({ label }) => label,
  );
}

export function unapprovedDestructiveMigrations(
  migrations: readonly { name: string; sql: string }[],
) {
  return migrations
    .map(({ name, sql }) => ({
      name,
      statements: APPROVAL.test(sql) ? [] : destructiveStatements(sql),
    }))
    .filter(({ statements }) => statements.length > 0);
}
