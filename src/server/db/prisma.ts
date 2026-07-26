import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/lib/env/server";
import { createPrismaClient as createDatabaseClient } from "@/server/db/create-prisma-client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const { DATABASE_URL } = getServerEnv();
  return createDatabaseClient(DATABASE_URL);
}

export function getPrisma(): PrismaClient {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}
