# Incident Response

## Ownership record

| Named incident lead role | Alert destination | Last exercise | Status / blocker |
|---|---|---|---|
| Unassigned | Unconfigured | Never | BLOCKED pending staging provisioning |

## Severity

- **SEV-1:** confirmed cross-user disclosure, secret compromise, destructive corruption, or broad outage.
- **SEV-2:** authentication, generation, export, worker, or database degradation with material user impact.
- **SEV-3:** isolated recoverable failure without security impact.

## Response

1. Assign incident lead and timestamp.
2. Contain: maintenance mode, registration/export/real-AI flags, credential rotation, or worker scale-down as appropriate.
3. Preserve safe evidence: request/job IDs, error categories, deploy commit, timing. Never copy customer content into incident chat.
4. Diagnose trusted boundaries and provider status.
5. Recover using rollback, forward fix, session invalidation, or verified restore.
6. Notify affected users and authorities only through approved legal/security process.
7. Write a blameless review with impact, timeline, cause, detection, corrective action, and owner.

Suspected data leakage is always SEV-1 until disproved.
