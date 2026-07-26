ALTER TYPE "GenerationJobStatus" ADD VALUE 'PARTIAL';
ALTER TYPE "GenerationScopeType" ADD VALUE 'CONTENT_SECTION';
ALTER TYPE "GenerationScopeType" ADD VALUE 'MODULE';
ALTER TYPE "GenerationModule" ADD VALUE 'WEBSITE';

CREATE TYPE "ProjectModuleStatus" AS ENUM ('READY', 'GENERATING', 'PARTIAL', 'COMPLETE', 'FAILED');

CREATE TABLE "ProjectModule" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "module" "ContentModule" NOT NULL,
  "status" "ProjectModuleStatus" NOT NULL DEFAULT 'READY',
  "settings" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectModule_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ContentItem" ADD COLUMN "identityKey" TEXT;

CREATE UNIQUE INDEX "ProjectModule_projectId_module_key" ON "ProjectModule"("projectId", "module");
CREATE INDEX "ProjectModule_projectId_status_idx" ON "ProjectModule"("projectId", "status");
CREATE UNIQUE INDEX "ContentItem_projectId_module_identityKey_key" ON "ContentItem"("projectId", "module", "identityKey");

ALTER TABLE "ProjectModule"
ADD CONSTRAINT "ProjectModule_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
