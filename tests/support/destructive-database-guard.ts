import { resolveDestructiveTestDatabaseUrl } from "@/test/test-database-url";

const testDatabaseUrl = resolveDestructiveTestDatabaseUrl(process.env);
process.env.DATABASE_URL = testDatabaseUrl;
