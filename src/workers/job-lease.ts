import type { PrismaClient } from "@/generated/prisma/client";
import type { ServerEnv } from "@/lib/env/server";

export type JobLease = Readonly<{
  jobId: string;
  leaseToken: string;
  workerId: string;
  leaseExpiresAt: Date;
}>;

export class LeaseLostError extends Error {
  constructor() {
    super("The generation job lease is no longer owned by this worker.");
    this.name = "LeaseLostError";
  }
}

export function leaseDurationMs(env: ServerEnv) {
  return Math.max(90_000, env.AI_REQUEST_TIMEOUT_MS + 30_000);
}

export function leaseRenewalIntervalMs(durationMs: number) {
  return Math.max(5_000, Math.floor(durationMs / 3) - 1_000);
}

export async function assertJobLease(
  prisma: PrismaClient,
  lease: JobLease,
): Promise<void> {
  const rows = await prisma.$queryRaw<{ owned: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM "GenerationJob"
      WHERE id = ${lease.jobId}
        AND "leaseToken" = ${lease.leaseToken}
        AND "leaseOwner" = ${lease.workerId}
        AND "leaseExpiresAt" > NOW()
    ) AS owned
  `;
  if (!rows[0]?.owned) throw new LeaseLostError();
}

export async function renewJobLease(
  prisma: PrismaClient,
  lease: JobLease,
  durationMs: number,
) {
  const rows = await prisma.$queryRaw<{ leaseExpiresAt: Date }[]>`
    UPDATE "GenerationJob"
    SET "leaseExpiresAt" = NOW() + (${durationMs} * INTERVAL '1 millisecond'),
        "lastLeaseHeartbeatAt" = NOW(),
        "updatedAt" = NOW()
    WHERE id = ${lease.jobId}
      AND "leaseToken" = ${lease.leaseToken}
      AND "leaseOwner" = ${lease.workerId}
      AND "leaseExpiresAt" > NOW()
      AND status IN ('RUNNING', 'VALIDATING', 'SAVING')
    RETURNING "leaseExpiresAt"
  `;
  if (!rows[0]) throw new LeaseLostError();
  return rows[0].leaseExpiresAt;
}

export async function releaseJobLease(prisma: PrismaClient, lease: JobLease) {
  return prisma.generationJob.updateMany({
    where: {
      id: lease.jobId,
      leaseToken: lease.leaseToken,
      leaseOwner: lease.workerId,
      status: { in: ["COMPLETED", "FAILED", "PARTIAL", "CANCELLED"] },
    },
    data: {
      leaseToken: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      lastLeaseHeartbeatAt: null,
    },
  });
}

const mutationOperations = new Set([
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
]);
const retryableProviderErrors = new Set([
  "TRANSIENT_NETWORK",
  "TIMEOUT",
  "RATE_LIMITED",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_SERVER_ERROR",
]);

export function retryDelayMs(attempt: number, retryAfterMs?: number) {
  const schedule = [5_000, 15_000, 45_000, 120_000] as const;
  const base =
    schedule[Math.min(Math.max(attempt - 1, 0), schedule.length - 1)]!;
  const deterministicJitter = Math.round(
    (base * (((attempt * 37) % 21) - 10)) / 100,
  );
  const computed = base + deterministicJitter;
  const providerDelay =
    retryAfterMs === undefined
      ? 0
      : Math.min(Math.max(retryAfterMs, 1_000), 300_000);
  return Math.min(Math.max(computed, providerDelay, 1_000), 300_000);
}

export function createLeaseFencedPrisma(
  prisma: PrismaClient,
  lease: JobLease,
): PrismaClient {
  const scoped = prisma.$extends({
    name: "generation-job-lease-fence",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (mutationOperations.has(operation))
            await assertJobLease(prisma, lease);
          if (operation === "update" && model === "GenerationJob") {
            const mutableArgs = args as {
              where?: { id?: string };
              data?: Record<string, unknown>;
            };
            const isLeasedJob = mutableArgs.where?.id === lease.jobId;
            const status = mutableArgs.data?.status;
            const safeErrorCode = mutableArgs.data?.safeErrorCode;
            if (
              status === "FAILED" &&
              isLeasedJob &&
              typeof safeErrorCode === "string" &&
              retryableProviderErrors.has(safeErrorCode)
            ) {
              const current = await prisma.generationJob.findUniqueOrThrow({
                where: { id: lease.jobId },
                select: {
                  attempt: true,
                  maxAttempts: true,
                  safeErrorDetails: true,
                },
              });
              if (current.attempt < current.maxAttempts) {
                const details =
                  typeof current.safeErrorDetails === "object" &&
                  current.safeErrorDetails !== null &&
                  !Array.isArray(current.safeErrorDetails)
                    ? (current.safeErrorDetails as Record<string, unknown>)
                    : {};
                const retryAfterMs =
                  typeof details.retryAfterMs === "number"
                    ? details.retryAfterMs
                    : undefined;
                mutableArgs.data = {
                  ...mutableArgs.data,
                  status: "QUEUED",
                  availableAt: new Date(
                    Date.now() + retryDelayMs(current.attempt, retryAfterMs),
                  ),
                  leaseToken: null,
                  leaseOwner: null,
                  leaseExpiresAt: null,
                  lastLeaseHeartbeatAt: null,
                  completedAt: null,
                  safeErrorDetails: {
                    retryScheduled: true,
                    providerError: safeErrorCode,
                    attempt: current.attempt,
                  },
                };
              }
            }
            if (
              mutableArgs.data &&
              ["COMPLETED", "FAILED", "PARTIAL", "CANCELLED"].includes(
                String(mutableArgs.data.status),
              ) &&
              isLeasedJob &&
              mutableArgs.data.status !== "QUEUED"
            ) {
              mutableArgs.data.leaseToken = lease.leaseToken;
              mutableArgs.data.leaseOwner = lease.workerId;
              mutableArgs.data.leaseExpiresAt = lease.leaseExpiresAt;
            }
          }
          return query(args);
        },
      },
    },
  });
  return scoped as unknown as PrismaClient;
}

export function startLeaseHeartbeat(input: {
  prisma: PrismaClient;
  lease: JobLease;
  durationMs: number;
  onLeaseLost: () => void;
}) {
  const interval = leaseRenewalIntervalMs(input.durationMs);
  let stopped = false;
  const timer = setInterval(() => {
    void renewJobLease(input.prisma, input.lease, input.durationMs).catch(
      () => {
        if (!stopped) input.onLeaseLost();
      },
    );
  }, interval);
  timer.unref();
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
