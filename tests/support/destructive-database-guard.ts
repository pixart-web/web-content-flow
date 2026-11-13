import { resolveDestructiveTestDatabaseUrl } from "@/test/test-database-url";

process.env.DATABASE_URL = resolveDestructiveTestDatabaseUrl(process.env);
