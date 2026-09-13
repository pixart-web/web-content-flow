# Production Smoke Tests

Record a named role, verification date, status, blocker, evidence URL/log reference, and rollback action for every execution. Never paste customer content, prompts, email addresses, credentials, worker IDs, or database URLs into the evidence.

Use a designated synthetic account and project. Do not use real customer content.

- [ ] Public home, pricing, privacy, terms, security, help, contact, status render.
- [ ] Liveness is 200; readiness is 200 and does not disclose internals.
- [ ] Registration matches the rollout state.
- [ ] Sign in, protected redirect, expired session recovery, and sign out work.
- [ ] Password reset email arrives, link resets once, reuse/expiry is neutral.
- [ ] Onboarding resumes the existing draft and project creation works.
- [ ] An owned project opens; a synthetic cross-user ID is neutral.
- [ ] Mock generation completes through the worker and persists after refresh.
- [ ] Real generation is tested only when explicitly enabled and budgeted.
- [ ] Usage and plan surfaces match server enforcement.
- [ ] TXT/Markdown/JSON and calendar CSV exports download with safe filenames.
- [ ] Expired or foreign export URLs are neutral.
- [ ] Mobile navigation and a core editor work at 320 px with keyboard focus.
- [ ] Logs contain IDs/categories, not briefs, prompts, generated content, reset tokens, secrets, or session values.

Record pass/fail, release commit, environment, tester, and timestamp. Any security or ownership failure blocks launch.
