# Capture Environment

## Guarded setup

Capture uses an isolated local/test PostgreSQL database and normal application authentication.

```bash
export NODE_ENV=development
export APP_ENV=local
export MARKETING_CAPTURE_MODE=true
export SEED_DEMO_DATA=true
export AI_PROVIDER_DEFAULT=MOCK
export AI_REAL_GENERATION_ENABLED=false
export EMAIL_PROVIDER=MOCK

pnpm prisma:migrate
pnpm prisma:seed
pnpm capture:seed
pnpm dev
pnpm capture:stills
```

`MARKETING_CAPTURE_MODE` defaults to false. Environment validation rejects it in production/staging and rejects real AI or real email while it is active. Analytics has no active provider. Capture mode creates no debug route and grants no extra permission.

## Determinism

- Fixed account and project IDs
- Fixed synthetic project and dates
- Existing deterministic mock-provider content
- Fixed viewport/crop script
- No live AI, email or analytics
- No customer or production data

The fixture transformer is seed-only. It must never run against a shared or production database.
