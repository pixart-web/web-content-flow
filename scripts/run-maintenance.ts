import "dotenv/config";

import { createPrismaClient } from "../src/server/db/create-prisma-client";
import { runMaintenanceBatch } from "../src/server/maintenance/maintenance-service";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const prisma = createPrismaClient(databaseUrl);

async function main() {
  try {
    const result = await runMaintenanceBatch(prisma);
    // Operational stdout is consumed by the process supervisor.
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ event: "maintenance.completed", ...result }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Maintenance failed.";
  console.error(message);
  process.exitCode = 1;
});
