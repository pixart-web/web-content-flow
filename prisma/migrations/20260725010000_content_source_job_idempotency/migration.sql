DROP INDEX "ContentItem_sourceJobId_idx";
CREATE UNIQUE INDEX "ContentItem_sourceJobId_key" ON "ContentItem"("sourceJobId");
DROP INDEX "ContentItemVersion_sourceJobId_idx";
CREATE UNIQUE INDEX "ContentItemVersion_sourceJobId_key" ON "ContentItemVersion"("sourceJobId");
