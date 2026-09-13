ALTER TABLE "GenerationJob"
ADD COLUMN "leaseOwner" TEXT,
ADD COLUMN "lastLeaseHeartbeatAt" TIMESTAMP(3);

CREATE INDEX "GenerationJob_leaseOwner_lastLeaseHeartbeatAt_idx"
ON "GenerationJob"("leaseOwner", "lastLeaseHeartbeatAt");

CREATE TABLE "WorkerHeartbeat" (
  "workerId" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "release" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "heartbeatAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkerHeartbeat_pkey" PRIMARY KEY ("workerId")
);

CREATE INDEX "WorkerHeartbeat_heartbeatAt_idx"
ON "WorkerHeartbeat"("heartbeatAt");
