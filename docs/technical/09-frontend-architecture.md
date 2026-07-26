# Frontend Architecture

Server Components are default for shell, dashboard, project/module reads, and item view. Client boundaries cover RHF forms, filters, dialogs/drawers, dirty-state guards, clipboard, and polling.

## Data and mutations

- Initial data loads server-side through authorized services.
- Server Actions return discriminated Result with field errors; revalidate/tag/redirect narrowly after success.
- Use optimistic UI only for reversible local metadata (filter, calendar status after rollback design). Do not optimistically claim job/version/export completion.
- Job status polls a small owner-authorized endpoint every 2–5 seconds while active, backs off when hidden/idle, and stops terminally. SSE is optional later; no WebSockets.
- Shareable filters live in URL query parameters; modal state/local drafts remain local.
- Explicit-save content editing uses RHF/Zod, dirty guard, and local/session recovery containing only necessary draft data. Clear after durable save; never analytics-log it.

## Component levels

Primitives (button/input/dialog) → shared patterns (job indicator, module card, content item, version list, status/empty/error) → feature components → screen compositions. Consume `design-tokens/tokens.css` semantic variables through Tailwind theme mapping; light mode only in MVP.

Use `loading.tsx` for initial skeletons, route `error.tsx` for unexpected failures, and explicit safe error states for expected service/job results. Accessibility follows UX: landmarks, focus restoration, live regions, 44 px targets, reduced motion, no arbitrary generated HTML.
