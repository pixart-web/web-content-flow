# Testing Strategy

| Layer | Coverage |
|---|---|
| Unit | state transitions, idempotency keys, normalization, filename, error mapping, context budgets |
| Schema | valid fixtures, boundaries, enum/array/string failures, schema versions, no unknown unsafe HTML |
| Repository | PostgreSQL integration for ownership, constraints, transactions, current pointers, leases |
| Service | authorized commands, conflicts, partial success, restore/export selection |
| Provider | mock determinism; OpenAI adapter mocked HTTP/error/usage/abort; no live paid CI |
| Jobs | lease contention, crash/recovery, bounded retry, cancel, stale reconciliation, saving idempotency |
| Export | Markdown/JSON/text golden semantic assertions, authorization, mock notice, injection-safe text |
| Components | forms, status, dialogs, keyboard/focus/live regions with Testing Library/Vitest |
| E2E | Playwright critical journeys across desktop/mobile; axe or equivalent plus manual AT checks |

Critical E2E: sign-up/sign-in; draft/resume wizard; mock profile/module; edit; regenerate retains version; restore; export; refresh/return; failure/retry; unauthorized project. Use isolated test DB, deterministic fixtures, worker test runner, fake clock where useful.

Authorization negative tests cover every Project-owned entity and IDOR permutations. Migration tests apply from empty and a representative previous schema. Accessibility includes keyboard, focus restoration, live generation state, reduced motion, 320 px, and no color-only status.
