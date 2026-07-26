CREATE TYPE "BrandProfileVersionSource" AS ENUM ('GENERATED', 'MANUAL_EDIT', 'RESTORED');
CREATE TYPE "GenerationJobStatus" AS ENUM ('PREPARING', 'QUEUED', 'RUNNING', 'VALIDATING', 'SAVING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "GenerationJobStepStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "GenerationMode" AS ENUM ('MOCK');
CREATE TYPE "GenerationScopeType" AS ENUM ('BRAND_PROFILE');
CREATE TYPE "GenerationModule" AS ENUM ('BRAND_PROFILE');

ALTER TABLE "Project" ADD COLUMN "currentBrandProfileVersionId" TEXT;

CREATE TABLE "ProjectBrief" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectBrief_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandProfileVersion" (
    "id" TEXT NOT NULL,
    "brandProfileId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "source" "BrandProfileVersionSource" NOT NULL,
    "actorUserId" TEXT,
    "mock" BOOLEAN NOT NULL DEFAULT false,
    "provenance" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BrandProfileVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentJobId" TEXT,
    "scopeType" "GenerationScopeType" NOT NULL,
    "scopeId" TEXT,
    "module" "GenerationModule" NOT NULL,
    "status" "GenerationJobStatus" NOT NULL DEFAULT 'PREPARING',
    "mode" "GenerationMode" NOT NULL DEFAULT 'MOCK',
    "idempotencyKey" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseToken" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "cancelRequestedAt" TIMESTAMP(3),
    "brandProfileVersionId" TEXT,
    "request" JSONB NOT NULL,
    "safeErrorCode" TEXT,
    "safeErrorDetails" JSONB,
    "usage" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GenerationJobStep" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "GenerationJobStepStatus" NOT NULL DEFAULT 'PENDING',
    "ordinal" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "safeErrorCode" TEXT,
    CONSTRAINT "GenerationJobStep_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Project_currentBrandProfileVersionId_key" ON "Project"("currentBrandProfileVersionId");
CREATE UNIQUE INDEX "ProjectBrief_projectId_key" ON "ProjectBrief"("projectId");
CREATE UNIQUE INDEX "BrandProfile_projectId_key" ON "BrandProfile"("projectId");
CREATE UNIQUE INDEX "BrandProfileVersion_brandProfileId_versionNumber_key" ON "BrandProfileVersion"("brandProfileId", "versionNumber");
CREATE INDEX "BrandProfileVersion_brandProfileId_createdAt_idx" ON "BrandProfileVersion"("brandProfileId", "createdAt" DESC);
CREATE INDEX "BrandProfileVersion_actorUserId_idx" ON "BrandProfileVersion"("actorUserId");
CREATE UNIQUE INDEX "GenerationJob_brandProfileVersionId_key" ON "GenerationJob"("brandProfileVersionId");
CREATE UNIQUE INDEX "GenerationJob_projectId_idempotencyKey_key" ON "GenerationJob"("projectId", "idempotencyKey");
CREATE INDEX "GenerationJob_projectId_createdAt_idx" ON "GenerationJob"("projectId", "createdAt" DESC);
CREATE INDEX "GenerationJob_status_availableAt_idx" ON "GenerationJob"("status", "availableAt");
CREATE INDEX "GenerationJob_status_leaseExpiresAt_idx" ON "GenerationJob"("status", "leaseExpiresAt");
CREATE INDEX "GenerationJob_parentJobId_idx" ON "GenerationJob"("parentJobId");
CREATE UNIQUE INDEX "GenerationJobStep_jobId_key_key" ON "GenerationJobStep"("jobId", "key");
CREATE INDEX "GenerationJobStep_jobId_ordinal_idx" ON "GenerationJobStep"("jobId", "ordinal");

ALTER TABLE "ProjectBrief" ADD CONSTRAINT "ProjectBrief_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandProfileVersion" ADD CONSTRAINT "BrandProfileVersion_brandProfileId_fkey" FOREIGN KEY ("brandProfileId") REFERENCES "BrandProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandProfileVersion" ADD CONSTRAINT "BrandProfileVersion_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_parentJobId_fkey" FOREIGN KEY ("parentJobId") REFERENCES "GenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_brandProfileVersionId_fkey" FOREIGN KEY ("brandProfileVersionId") REFERENCES "BrandProfileVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GenerationJobStep" ADD CONSTRAINT "GenerationJobStep_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_currentBrandProfileVersionId_fkey" FOREIGN KEY ("currentBrandProfileVersionId") REFERENCES "BrandProfileVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
