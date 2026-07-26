import "dotenv/config";

import { createPrismaClient } from "../src/server/db/create-prisma-client";
import { processNextJob } from "../src/workers/generation-worker";

const once = process.argv.includes("--once");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const prisma = createPrismaClient(databaseUrl);
let shuttingDown = false;
let heartbeat: ReturnType<typeof setInterval> | undefined;

for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, () => {
    shuttingDown = true;
  });

async function run() {
  try {
    heartbeat = setInterval(() => {
      // Operational stdout is consumed by the process supervisor.
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify({
          event: "worker.heartbeat",
          state: shuttingDown ? "draining" : "running",
        }),
      );
    }, 30_000);
    do {
      if (shuttingDown) break;
      const processed = await processNextJob(prisma);
      if (once) break;
      await new Promise((resolve) =>
        setTimeout(resolve, processed ? 250 : 2_000),
      );
    } while (true);
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    await prisma.$disconnect();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Worker failed.";
  console.error(message);
  process.exitCode = 1;
});
