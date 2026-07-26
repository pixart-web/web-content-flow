# Authentication and Authorization

Use Auth.js with a Prisma adapter. Final credential/provider choice remains open: password recovery is straightforward only with a credential system or provider that owns reset email/flow. Do not implement custom password hashing/recovery casually.

Recommend database sessions for explicit revocation and Auth.js adapter compatibility. Cookies are Secure, HttpOnly, SameSite=Lax (or stricter where compatible); rotate/expire according to Auth.js guidance. Server Actions retain origin/CSRF protections; Route Handlers validate method, content type, session, and CSRF where custom cookie-auth mutations require it.

## Authorization contracts

```text
requireUser() -> AuthenticatedUser
requireProjectOwner(projectId) -> AuthorizedProject
requireContentItemOwner(itemId) -> AuthorizedContentItem + project
requireGenerationJobOwner(jobId) -> AuthorizedJob + project
```

Each runs server-side and queries ownership through indexed relations using the session user ID. Services accept authorized handles or repeat an owner-scoped query; middleware only redirects signed-out routes and never substitutes resource authorization. Client userId/project owner fields are ignored.

Unauthorized and missing resources return the same neutral 404-like result. Deep links preserve safe internal return routes. Session expiry returns an authentication-required result without destroying local unsaved draft.

Rate-limit auth attempts, recovery, project creation, generation, regeneration, and export by account/IP risk. Account deletion requires reauthentication where supported, confirmation, retention decision, cascade/reconciliation, and security audit event. No organizations, roles, or invitations.
