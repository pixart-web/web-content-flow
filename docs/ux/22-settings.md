# Settings

## Screen specification

- **Screen/routes:** Account Settings `/app/settings`; Project Settings `/app/projects/:projectId/settings`.
- **Purpose/goal:** Manage only account/project configuration needed by MVP.
- **Entry/exit:** shell/account menu/project nav → prior route/sign out/dashboard.
- **Required data:** display name/provider account capabilities, generation mode/config availability, language default optional; project name/brand/modules; deletion capability/policy.
- **Hierarchy:** Account: profile → generation → language optional → security/provider → danger zone/sign out. Project: identity → modules → danger zone.
- **Desktop:** 720 px form; **tablet/mobile:** one column, full-width controls.
- **Primary:** section-specific `Save changes`; **secondary:** provider account action, sign out, delete if implemented.
- **Components:** inputs, radio/switch for mode, secret input if BYOK, module checkboxes, status alerts, destructive dialog.
- **States:** default/loading/saving/saved/failed; provider unavailable; mock active; delete pending/failed.
- **Security/accessibility/analytics:** never redisplay/log keys; reauthentication if provider requires; labels/focus/error; settings/mode/sign-out/delete events without secrets.
- **Acceptance:** mock/real mode is clear; module removal warns but does not silently delete content; destructive project/account deletion names consequences.
- **Out of scope:** billing, team, integrations, API management, notification preferences, roles.

## Conditional behavior

- Password changes use provider handling only if supported; do not invent an in-app password system.
- Provider configuration appears only if chosen strategy requires it; stored key shows configured/not configured, never value.
- Account deletion requires retention/deletion policy decision before implementation.
- Project archive is absent unless approved. Project deletion confirmation lists Brief, Brand Profile, content items, versions, and calendar references; typed project name may be required for irreversible deletion.
- Removing a selected module hides it from active navigation but retains its content unless a separate explicit deletion action is confirmed.

Wireframe: [Settings](../../wireframes/app/settings.md).
