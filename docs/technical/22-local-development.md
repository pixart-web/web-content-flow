# Local Development

Recommended baseline at implementation: current active LTS Node.js (pin exact version in Phase 0), package manager lockfile, PostgreSQL 16-compatible local database, and environment validation. Docker PostgreSQL or a managed development branch are acceptable; document chosen workflow.

Required local values: database/Auth.js values, `AI_MODE=mock|openai`, optional OpenAI key only for explicit real tests, worker settings, optional analytics disabled/no-op. `.env.example` contains names/placeholders only; `.env.local` is ignored.

Run application and worker separately; worker may run in-process only in deterministic tests, not as production architecture. Mock mode requires no AI key and uses fixtures under `architecture/examples` or future test fixtures through the same schemas/provider interface.

Seed fictional user/project `UrbanStride`, clearly `mock=true`. Local email/password recovery may use provider console/logged synthetic link or a mail-catcher; never log production tokens.

Developer safety: no production DB credentials locally, no real customer data, paid AI opt-in with cost cap, synthetic debug only, migration/reset commands environment-guarded. Commands are defined only when Phase 0 initializes the repository; this document does not create package configuration.
