# Contributing

Calendar changes must preserve exact source-version capture, IANA timezone validation, bounded snapshots, immutable versions, and the planning-only external boundary. Never add provider publishing side effects or log calendar titles, entries, notes, or source content.

## Workflow

- Use a focused branch and small reviewable commits. Follow the repository’s commit/PR conventions once adopted; do not rewrite shared history.
- Keep changes within the approved implementation phase. Record durable architectural changes as ADRs and update affected foundations.
- Run `pnpm check`, `pnpm build`, and relevant Playwright tests before requesting review.

## Coding standards

- Strict TypeScript; no `any`. Use `unknown` at untrusted boundaries and validate with Zod.
- Server Components by default; Client Components only for required interaction.
- Preserve feature boundaries and dependency direction. Do not import future server code into Client Components.
- Use semantic design tokens; do not add raw color values to React components.
- Prefer accessible native semantics and maintain visible focus, keyboard behavior, and 44 px touch targets.

## Security and privacy

- Never commit secrets, fallback secrets, API keys, session values, or production configuration.
- Never add customer/user content to fixtures, logs, analytics, screenshots, or tests. Use fictional synthetic data.
- Never log raw prompts, generated snapshots, provider keys, raw provider request IDs, or clipboard content.
- Live provider calls are forbidden in automated tests and CI; use mock mode or the deterministic fake OpenAI transport.
- Never render arbitrary HTML or use `dangerouslySetInnerHTML` for generated content.
- Social content must remain structured plain text. Never add platform credentials, publishing/scheduling behavior, or generated Social text to analytics.
- Advertising content must remain structured plain text. Never add ad credentials, platform API calls, landing-page fetching, publishing, performance forecasts, generated copy, or image prompts to logs or analytics.
- Video planning content must remain structured plain text. Never add media uploads, rendering/playback, TTS, voice cloning, platform credentials/APIs, publishing, or generated scripts/scenes/captions to logs or analytics.
- General Copy must remain bounded structured plain text. Never add sending, publishing, CRM/CMS/commerce actions, external URL fetching, generated copy, topics, audience text, or clipboard content to logs or analytics.
- Do not fetch untrusted external URLs without an approved SSRF-safe design.
- Dependencies must be necessary for the active phase and audited before merge.
- Never query a project by resource ID alone. Every server resource query must include the authenticated owner path.
- Content items, versions, Library queries, and item jobs must traverse project ownership and use neutral unavailable responses.
- Never log passwords, hashes, session tokens, authentication cookies, or full database errors.
- Authentication return URLs must remain internal and allowlisted.

## Documentation and tests

- Update documentation, reference contracts, token sources, and tests with behavior changes.
- Token changes must update `tokens.json`, `tokens.css`, the TypeScript reference, and affected design docs.
- Add deterministic tests for new validation and error behavior; include accessibility and authorization negative tests when those phases begin.
- Repository and authorization changes require PostgreSQL integration coverage; mocks cannot replace ownership-query tests.
- Generation changes require worker tests for leasing, bounded attempts, failure handling, and immutable version persistence.
- Content snapshot types must be registered with bounded Zod schemas and framework-neutral editor definitions; arbitrary JSON editors are prohibited.
- Mock generation must remain deterministic and must not make network calls.
- Apply schema changes through reviewed Prisma migrations. Do not edit an already deployed migration.

## Database and worker checks

Against an isolated local test database:

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm test:integration
pnpm test:worker
```

Synthetic seed data requires `SEED_DEMO_DATA=true` and must never run in production.

## Pull-request checklist

- [ ] Scope matches the active implementation phase.
- [ ] `pnpm check`, build, and relevant E2E tests pass.
- [ ] No secrets, customer content, `any`, unsafe HTML, or unapproved dependency.
- [ ] Semantic tokens and accessibility rules are followed.
- [ ] Documentation/ADRs and `.env.example` are updated when needed.
- [ ] Error messages are safe and contain no internals.
- [ ] Project reads are owner-scoped on the server and IDOR negative tests pass.
