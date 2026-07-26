ALTER TYPE "GenerationMode" ADD VALUE 'REAL';

CREATE TYPE "GenerationProvider" AS ENUM ('MOCK', 'OPENAI');
CREATE TYPE "GenerationModelTier" AS ENUM ('STANDARD', 'PREMIUM', 'REPAIR');
CREATE TYPE "GenerationPurpose" AS ENUM (
  'MODULE_GENERATION',
  'ITEM_GENERATION',
  'WHOLE_ITEM_REGENERATION',
  'SECTION_REGENERATION',
  'FIELD_REGENERATION',
  'VARIANT_REGENERATION',
  'CALENDAR_PERIOD_REGENERATION',
  'CALENDAR_ENTRY_REGENERATION',
  'STRUCTURAL_REPAIR'
);
CREATE TYPE "GenerationUsageSource" AS ENUM ('PROVIDER_REPORTED', 'ESTIMATED', 'UNAVAILABLE');
CREATE TYPE "UsageReservationStatus" AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED', 'EXPIRED');

ALTER TABLE "GenerationJob"
  ADD COLUMN "provider" "GenerationProvider" NOT NULL DEFAULT 'MOCK',
  ADD COLUMN "modelTier" "GenerationModelTier" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "modelId" TEXT,
  ADD COLUMN "promptKey" TEXT,
  ADD COLUMN "promptVersion" TEXT,
  ADD COLUMN "generationPurpose" "GenerationPurpose",
  ADD COLUMN "briefRevision" INTEGER,
  ADD COLUMN "providerAttemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "normalizedProviderError" TEXT,
  ADD COLUMN "repairAttempted" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "GenerationUsage" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "generationJobId" TEXT NOT NULL,
  "contentItemVersionId" TEXT,
  "provider" "GenerationProvider" NOT NULL,
  "modelId" TEXT NOT NULL,
  "modelTier" "GenerationModelTier" NOT NULL,
  "promptKey" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL,
  "generationPurpose" "GenerationPurpose" NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "repair" BOOLEAN NOT NULL DEFAULT false,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "cachedInputTokens" INTEGER,
  "reasoningTokens" INTEGER,
  "totalTokens" INTEGER,
  "estimatedCostMinorUnits" BIGINT,
  "currency" TEXT,
  "usageSource" "GenerationUsageSource" NOT NULL,
  "providerRequestIdHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GenerationUsage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageReservation" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "generationJobId" TEXT NOT NULL,
  "reservedTokens" INTEGER NOT NULL,
  "status" "UsageReservationStatus" NOT NULL DEFAULT 'RESERVED',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedTokens" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UsageReservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GenerationUsage_generationJobId_attemptNumber_repair_key"
  ON "GenerationUsage"("generationJobId", "attemptNumber", "repair");
CREATE INDEX "GenerationUsage_projectId_createdAt_idx" ON "GenerationUsage"("projectId", "createdAt");
CREATE INDEX "GenerationUsage_userId_createdAt_idx" ON "GenerationUsage"("userId", "createdAt");
CREATE INDEX "GenerationUsage_generationJobId_idx" ON "GenerationUsage"("generationJobId");
CREATE UNIQUE INDEX "UsageReservation_generationJobId_key" ON "UsageReservation"("generationJobId");
CREATE INDEX "UsageReservation_projectId_status_expiresAt_idx" ON "UsageReservation"("projectId", "status", "expiresAt");
CREATE INDEX "UsageReservation_userId_status_expiresAt_idx" ON "UsageReservation"("userId", "status", "expiresAt");
CREATE INDEX "GenerationJob_projectId_mode_createdAt_idx" ON "GenerationJob"("projectId", "mode", "createdAt" DESC);
CREATE INDEX "GenerationJob_provider_status_availableAt_idx" ON "GenerationJob"("provider", "status", "availableAt");

ALTER TABLE "GenerationUsage" ADD CONSTRAINT "GenerationUsage_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GenerationUsage" ADD CONSTRAINT "GenerationUsage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GenerationUsage" ADD CONSTRAINT "GenerationUsage_generationJobId_fkey"
  FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GenerationUsage" ADD CONSTRAINT "GenerationUsage_contentItemVersionId_fkey"
  FOREIGN KEY ("contentItemVersionId") REFERENCES "ContentItemVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageReservation" ADD CONSTRAINT "UsageReservation_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageReservation" ADD CONSTRAINT "UsageReservation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageReservation" ADD CONSTRAINT "UsageReservation_generationJobId_fkey"
  FOREIGN KEY ("generationJobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
