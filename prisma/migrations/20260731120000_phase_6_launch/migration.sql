CREATE TYPE "PlanId" AS ENUM ('FREE', 'INTERNAL');
CREATE TYPE "ExportFormat" AS ENUM ('PLAIN_TEXT', 'MARKDOWN', 'JSON', 'CSV');
CREATE TYPE "ExportScope" AS ENUM ('SINGLE_ITEM', 'SELECTED_ITEMS', 'MODULE', 'LIBRARY_FILTER', 'CALENDAR', 'PROJECT_PACKAGE');
CREATE TYPE "ExportStatus" AS ENUM ('COMPLETE', 'FAILED', 'EXPIRED');

ALTER TABLE "User"
  ADD COLUMN "plan" "PlanId" NOT NULL DEFAULT 'FREE',
  ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentExport" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "status" "ExportStatus" NOT NULL DEFAULT 'COMPLETE',
  "format" "ExportFormat" NOT NULL,
  "scope" "ExportScope" NOT NULL,
  "selectedVersionIds" JSONB NOT NULL,
  "filename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "payload" BYTEA,
  "byteSize" INTEGER NOT NULL,
  "checksum" TEXT NOT NULL,
  "errorCode" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "ContentExport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RateLimitBucket" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "subjectHash" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
CREATE INDEX "ContentExport_projectId_createdAt_idx" ON "ContentExport"("projectId", "createdAt" DESC);
CREATE INDEX "ContentExport_requestedByUserId_createdAt_idx" ON "ContentExport"("requestedByUserId", "createdAt" DESC);
CREATE INDEX "ContentExport_status_expiresAt_idx" ON "ContentExport"("status", "expiresAt");
CREATE UNIQUE INDEX "RateLimitBucket_action_subjectHash_windowStart_key" ON "RateLimitBucket"("action", "subjectHash", "windowStart");
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentExport" ADD CONSTRAINT "ContentExport_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentExport" ADD CONSTRAINT "ContentExport_requestedByUserId_fkey"
  FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
