-- B-05 (ADR-070, ADR-075): record the AI Gateway route. Additive and
-- nullable only, so existing rows stay valid and the change is reversible
-- by dropping the columns. The GenerationProvider enum is unchanged.

ALTER TABLE "GenerationJob"
ADD COLUMN "runtimeKey" TEXT,
ADD COLUMN "modelRef" TEXT,
ADD COLUMN "providerKind" TEXT,
ADD COLUMN "policyKey" TEXT,
ADD COLUMN "policyVersion" TEXT,
ADD COLUMN "fallbackUsed" BOOLEAN,
ADD COLUMN "structuredMode" TEXT;

ALTER TABLE "GenerationUsage"
ADD COLUMN "runtimeKey" TEXT,
ADD COLUMN "modelRef" TEXT,
ADD COLUMN "providerKind" TEXT,
ADD COLUMN "policyKey" TEXT,
ADD COLUMN "policyVersion" TEXT,
ADD COLUMN "fallbackUsed" BOOLEAN,
ADD COLUMN "structuredMode" TEXT,
ADD COLUMN "latencyMs" INTEGER;

CREATE INDEX "GenerationUsage_runtimeKey_createdAt_idx"
ON "GenerationUsage"("runtimeKey", "createdAt");
