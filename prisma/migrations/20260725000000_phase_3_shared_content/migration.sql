ALTER TYPE "GenerationScopeType" ADD VALUE 'CONTENT_ITEM';
ALTER TYPE "GenerationModule" ADD VALUE 'COPY';

CREATE TYPE "ContentModule" AS ENUM ('WEBSITE', 'SOCIAL', 'ADS', 'VIDEO', 'COPY');
CREATE TYPE "ContentStatus" AS ENUM ('IDEA', 'DRAFT', 'APPROVED', 'SCHEDULED', 'PUBLISHED');
CREATE TYPE "ContentItemVersionSource" AS ENUM ('GENERATED', 'MANUAL_EDIT', 'REGENERATED', 'RESTORED');

CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "module" "ContentModule" NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionId" TEXT,
    "sourceJobId" TEXT,
    "sourceBrandProfileVersionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentItemVersion" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "source" "ContentItemVersionSource" NOT NULL,
    "sourceJobId" TEXT,
    "brandProfileVersionId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "mock" BOOLEAN NOT NULL DEFAULT false,
    "provenance" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentItemVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentItem_currentVersionId_key" ON "ContentItem"("currentVersionId");
CREATE INDEX "ContentItem_projectId_module_status_idx" ON "ContentItem"("projectId", "module", "status");
CREATE INDEX "ContentItem_projectId_updatedAt_idx" ON "ContentItem"("projectId", "updatedAt" DESC);
CREATE INDEX "ContentItem_sourceJobId_idx" ON "ContentItem"("sourceJobId");
CREATE INDEX "ContentItem_sourceBrandProfileVersionId_idx" ON "ContentItem"("sourceBrandProfileVersionId");
CREATE UNIQUE INDEX "ContentItemVersion_contentItemId_versionNumber_key" ON "ContentItemVersion"("contentItemId", "versionNumber");
CREATE INDEX "ContentItemVersion_contentItemId_createdAt_idx" ON "ContentItemVersion"("contentItemId", "createdAt" DESC);
CREATE INDEX "ContentItemVersion_sourceJobId_idx" ON "ContentItemVersion"("sourceJobId");
CREATE INDEX "ContentItemVersion_brandProfileVersionId_idx" ON "ContentItemVersion"("brandProfileVersionId");
CREATE INDEX "ContentItemVersion_actorUserId_idx" ON "ContentItemVersion"("actorUserId");

ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "ContentItemVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_sourceJobId_fkey" FOREIGN KEY ("sourceJobId") REFERENCES "GenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_sourceBrandProfileVersionId_fkey" FOREIGN KEY ("sourceBrandProfileVersionId") REFERENCES "BrandProfileVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContentItemVersion" ADD CONSTRAINT "ContentItemVersion_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentItemVersion" ADD CONSTRAINT "ContentItemVersion_sourceJobId_fkey" FOREIGN KEY ("sourceJobId") REFERENCES "GenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentItemVersion" ADD CONSTRAINT "ContentItemVersion_brandProfileVersionId_fkey" FOREIGN KEY ("brandProfileVersionId") REFERENCES "BrandProfileVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContentItemVersion" ADD CONSTRAINT "ContentItemVersion_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
