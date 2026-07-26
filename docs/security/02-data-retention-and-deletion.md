# Data Retention and Deletion

## Current policy

- Projects, briefs, Brand Profiles, content, and immutable versions remain until the user or an approved deletion workflow removes the project/account.
- Sessions expire per authentication configuration and are invalidated after password reset/change.
- Password reset tokens expire after 30 minutes; maintenance deletes expired or used records.
- Completed export payloads expire after the configured bounded retention; maintenance clears payload bytes.
- Rate-limit buckets, expired usage reservations, and stale onboarding drafts are removed by maintenance.
- Logs and analytics must never contain briefs, prompts with customer content, generated snapshots, clipboard values, tokens, or secrets.

Account deletion is disabled pending a reviewed cascade, recovery window, export option, legal hold policy, and provider deletion obligations. Support must not promise deletion until this workflow exists.

Retention periods must be approved for launch jurisdictions and configured consistently in database, logging, email, AI, analytics, backups, and support systems.
