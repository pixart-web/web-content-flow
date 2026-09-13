import "dotenv/config";
import { randomUUID } from "node:crypto";

import { createPrismaClient } from "../src/server/db/create-prisma-client";
import { processNextJob } from "../src/workers/generation-worker";

const once = process.argv.includes("--once");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const prisma = createPrismaClient(databaseUrl);
let shuttingDown = false;
let heartbeat: ReturnType<typeof setInterval> | undefined;
const workerId = `worker-${randomUUID()}`;

async function recordHeartbeat(state: "running" | "draining") {
  const release = process.env.APP_RELEASE?.slice(0, 100) ?? null;
  await prisma.workerHeartbeat.upsert({
    where: { workerId },
    create: {
      workerId,
      state,
      release,
    },
    update: { state, release },
  });
}

for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, () => {
    shuttingDown = true;
  });

async function run() {
  try {
    await recordHeartbeat("running");
    heartbeat = setInterval(() => {
      void recordHeartbeat(shuttingDown ? "draining" : "running").catch(() => {
        console.error(JSON.stringify({ event: "worker.heartbeat_failed" }));
      });
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
      const processed = await processNextJob(prisma, workerId);
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
