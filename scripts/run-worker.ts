import "dotenv/config";

import { createPrismaClient } from "../src/server/db/create-prisma-client";
import { processNextJob } from "../src/workers/generation-worker";

const once = process.argv.includes("--once");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const prisma = createPrismaClient(databaseUrl);

async function run() {
  try {
    do {
      const processed = await processNextJob(prisma);
      if (once) break;
      await new Promise((resolve) =>
        setTimeout(resolve, processed ? 250 : 2_000),
      );
    } while (true);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Worker failed.";
  console.error(message);
  process.exitCode = 1;
});
