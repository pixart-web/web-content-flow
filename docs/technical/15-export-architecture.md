# Export Architecture

Authorized export command accepts an allowlisted selection of current profile/item versions, normalizes them into an `ExportDocument`, and dispatches one renderer contract. Renderers: Markdown, canonical JSON, and plain text where useful. Calendar CSV remains excluded until approved; no PDF, DOCX, or ZIP promise.

Flow: authorize Project → validate IDs belong to project → resolve current explicit versions → normalize stable headings/labels → add mock notice when any selection is mock → render → safe filename → response or ExportJob result.

Normal MVP exports under configured count/size limits are synchronous Node responses. Large selections can create durable ExportJob using the same idempotency pattern; optional generated file gets short retention in object storage. Failure preserves content and offers retry/copy.

Filename: `web-content-flow_<sanitized-project>_<scope>_<YYYY-MM-DD>.<ext>` with ASCII-safe fallback and no user path characters. JSON includes schema/export version and provenance metadata but excludes secrets, internal prompts, provider payloads, and unauthorized rows.

Security headers use attachment disposition, correct MIME, `nosniff`, and no inline arbitrary HTML. See [renderer contract](../../architecture/contracts/export-renderer.ts) and [export schema](../../architecture/schemas/export.schema.ts).
