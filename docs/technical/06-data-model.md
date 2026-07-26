# Data Model

## Current-version strategy

Use explicit nullable foreign keys `Project.currentBrandProfileVersionId` (or BrandProfile current pointer) and `ContentItem.currentVersionId`, plus monotonically increasing `versionNumber` unique per parent. Do not use mutable `isCurrent` flags. Creation transaction locks/updates parent, inserts immutable snapshot, then updates pointer; restore creates a new snapshot. This makes reads direct and prevents multiple-current anomalies.

## Entities

| Entity | Key fields (nullable marked ?) | Relationships/constraints/indexes | Deletion/ownership/lifecycle |
|---|---|---|---|
| User | id, name?, email?, emailVerified?, image?, createdAt | email unique when present | owns Projects; Auth.js lifecycle |
| Account | id,userId,type,provider,providerAccountId,tokens? | unique provider/account; user index | cascade User; Auth.js |
| Session | id,sessionToken,userId,expires | token unique; user/expires indexes | cascade User |
| VerificationToken | identifier,token,expires | composite unique/token unique | expiry cleanup |
| Project | id,userId,name,brandName,type,status,outputLanguage,currentBrandProfileVersionId?,created/updated | user index; current profile FK deferred relation | root owner; DRAFT/ACTIVE; explicit deletion |
| ProjectBrief | id,projectId,data JSONB,schemaVersion,revision,created/updated | project unique | cascade; mutable source with optimistic revision |
| ProjectModule | id,projectId,module,status,settings JSONB?,created/updated | unique project/module | NOT_SELECTED/READY/etc.; cascade |
| BrandProfile | id,projectId,createdAt | project unique | container; cascade |
| BrandProfileVersion | id,brandProfileId,versionNumber,snapshot JSONB,schemaVersion,source,sourceJobId?,actorUserId?,mock,provenance JSONB,createdAt | unique parent/version; job index | immutable; owner via profile→project |
| ContentItem | id,projectId,module,type,title,status,currentVersionId?,sourceJobId?,sourceBrandProfileVersionId?,created/updated | project/module/status index | canonical item; cascade project |
| ContentItemVersion | id,contentItemId,versionNumber,snapshot JSONB,schemaVersion,source,sourceJobId?,brandProfileVersionId,actorUserId?,mock,provenance JSONB,createdAt | unique item/version | immutable |
| GenerationJob | id,projectId,parentJobId?,scopeType,scopeId?,module?,status,mode,idempotencyKey,attempt,maxAttempts,availableAt,leaseToken?,leaseExpiresAt?,cancelRequestedAt?,brandProfileVersionId?,request JSONB,safeErrorCode?,usage JSONB?,timestamps | unique project/scope/idempotency; status/available/lease indexes | durable state; cascade project |
| GenerationJobStep | id,jobId,key,label,status,ordinal,startedAt?,completedAt?,safeErrorCode? | unique job/key; job/ordinal | durable truthful step; cascade job |
| CalendarEntry | id,projectId,contentItemId,plannedAt,status,note?,created/updated | project/date and item indexes | references canonical item; no body copy |
| ExportJob | id,projectId,userId,status,format,selection JSONB,idempotencyKey,objectKey?,safeErrorCode?,expiresAt?,timestamps | project/status; unique idempotency | authorized export; cleanup object |
| Asset | id,projectId,type,name,mimeType?,size?,objectKey?,metadata JSONB?,sourceContentItemId?,createdAt | project/type index | metadata; text assets may have no object |
| AuditEvent? | id,projectId?,userId?,action,resourceType,resourceId?,safeMetadata JSONB,createdAt | project/time | only security/destructive operations; never content |

Lifecycle enums are defined at application/Prisma boundaries. Jobs reference the exact Brand Profile version used; content items/versions reference source job/profile and mock marker. Calendar always points to ContentItem.
