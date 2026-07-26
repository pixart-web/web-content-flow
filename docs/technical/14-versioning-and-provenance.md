# Versioning and Provenance

BrandProfileVersion and ContentItemVersion are immutable snapshots. Parent containers point to one current version FK and versions use unique increasing numbers.

## Creation boundaries

- Initial validated generation creates v1.
- Explicit multi-field Save creates one manual-edit version; no version per keystroke/autosave tick.
- Regenerate field/section/item creates a full new snapshot with source `REGENERATED` and retains prior snapshot.
- Restore vN copies its snapshot into a new version with source `RESTORED`, `restoredFromVersionId`, then makes the new version current.
- Metadata-only calendar changes do not create content versions. Status-only item changes create versions only if later audit requirements justify it.

Provenance records source type, actor user ID for manual operations, source job ID, exact Brand Profile version, prompt/schema version, provider/model, brief revision, timestamp, mock marker, and safe transformation type. Do not store chain-of-thought or sensitive rendered prompts.

Current-pointer update and version insert are one transaction under parent lock/optimistic check. Historical rows are application-read-only and protected from ordinary update/delete repository methods. Existing content retains its profile link after profile changes; “outdated” is derived comparison, not automatic mutation.

Retention/deletion removes snapshots only with their owning project/account under approved policy; version growth is controlled by item/generation limits and monitored, not silently compacted.
