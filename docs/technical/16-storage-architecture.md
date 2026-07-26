# Storage Architecture

Object storage is not required for plain generated text, prompts, palettes, or version snapshots; keep them in PostgreSQL. Delay integration until persistent large exports or approved uploads require it.

If introduced, use an S3-compatible adapter with project-prefixed opaque object keys, private buckets, server-authorized short-lived signed GET/PUT URLs, MIME allowlist, size limits, checksum, and metadata in Asset/ExportJob. Never derive ownership from object key supplied by client.

Uploads are out of current MVP. Before enabling them add server-side type/signature validation, malware scanning or quarantine workflow appropriate to file types, SSRF-safe ingestion (prefer direct upload; no arbitrary URL fetch), rate limits, and deletion reconciliation.

Exports use attachment MIME, short retention, and database reference; expired/deleted project objects are removed idempotently. Storage credentials remain server-only and separate per environment. Missing object is recoverable by re-rendering export when source versions still exist.
