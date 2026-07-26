# User Journeys

These journeys define expected MVP behavior. “System” responses describe intended behavior, not existing functionality.

## 1. New user registration

- **Trigger:** A visitor selects **Create account**.
- **Prerequisites:** Visitor is signed out and accepts required terms.
- **Steps:** Enter credentials; submit; complete provider-required verification; sign in.
- **System responses:** Validate fields; create account; establish session; show onboarding/dashboard.
- **Possible errors:** Existing email, weak password, expired verification, provider outage, rate limit. Preserve safe inputs and provide recovery instructions.
- **Completion state:** Authenticated user reaches an empty dashboard with **Create project** as the primary action.

## 2. First project creation

- **Trigger:** User selects **Create project**.
- **Prerequisites:** Authenticated account.
- **Steps:** Enter project name, brand name, project type, objective, and selected modules; continue to brief.
- **System responses:** Create a draft project, autosave or save each step, show progress and required fields.
- **Possible errors:** Missing required fields, save failure, duplicate submission. Keep local form state and allow retry.
- **Completion state:** Draft project exists and opens at the next incomplete brief step.

## 3. Brief completion

- **Trigger:** User opens the project brief during or after project creation.
- **Prerequisites:** Draft project and edit permission.
- **Steps:** Complete business, audience, offer, objective, voice, visual, reference, language, and module fields; review summary; confirm.
- **System responses:** Save progress; distinguish required and optional information; flag conflicting or insufficient inputs; show completeness.
- **Possible errors:** Invalid URLs, unsupported values, save conflict, offline state, incomplete essentials. Do not discard entered content.
- **Completion state:** Brief is marked ready for Brand Profile generation and remains editable.

## 4. Brand generation

- **Trigger:** User selects **Generate Brand Profile**.
- **Prerequisites:** Brief meets minimum completeness; no conflicting active Brand Profile job.
- **Steps:** Confirm generation; monitor job; review structured profile; edit or approve for use.
- **System responses:** Create generation job; show queued/running/completed status; validate output; store profile version and provenance.
- **Possible errors:** Provider timeout, invalid structured output, moderation rejection, quota/cost limit, lost connection. Preserve the brief, show whether retry is safe, and never replace the last valid profile on failure.
- **Completion state:** A complete Brand Profile version is available as shared context; approval status is visible.

## 5. Full content-pack generation

- **Trigger:** User selects **Generate content pack** after choosing modules.
- **Prerequisites:** Valid Brand Profile and at least one selected module.
- **Steps:** Review selected modules; start; monitor per-module jobs; open results as they complete.
- **System responses:** Create bounded generation jobs; expose progress independently; validate and save content items by module; allow partial success.
- **Possible errors:** One module fails, usage limit, provider outage, invalid output, duplicate click. Completed modules remain available; failed modules can retry.
- **Completion state:** Every selected module is complete or explicitly failed/skipped; project overview summarizes results.

## 6. Opening and navigating a project

- **Trigger:** User selects a project from the dashboard or uses a valid project URL.
- **Prerequisites:** Authenticated user owns or is authorized for the project.
- **Steps:** Open overview; inspect status; navigate to Brief, Brand Profile, module, Calendar, or Library.
- **System responses:** Load project shell first; highlight active section; show recent jobs and incomplete setup.
- **Possible errors:** Project not found, unauthorized access, partial data failure. Show safe not-found/access state; retry independently loadable sections.
- **Completion state:** Selected section is visible with project context and stable navigation.

## 7. Editing generated content

- **Trigger:** User selects **Edit** on a content item.
- **Prerequisites:** Existing content item and edit permission.
- **Steps:** Change one or more fields; preview if relevant; save.
- **System responses:** Validate fields; create a new item version; retain original provenance; mark current version as user-edited.
- **Possible errors:** Validation failure, concurrent/stale edit, save failure. Keep unsaved text and offer retry; do not overwrite silently.
- **Completion state:** Updated version is current and appears in its module and library.

## 8. Regenerating one item

- **Trigger:** User selects **Regenerate** on one content item.
- **Prerequisites:** Valid Brand Profile, item schema, and generation availability.
- **Steps:** Optionally provide a short instruction; confirm replacement behavior; start job; review result.
- **System responses:** Create an item-scoped job using current item context and Brand Profile; retain prior version; update only that item after validation.
- **Possible errors:** Failed generation, invalid output, limit reached, profile changed. Keep current item unchanged and make retry or profile-version choice clear.
- **Completion state:** New generated version is current, or the user keeps the previous version.

## 9. Exporting project content

- **Trigger:** User selects **Export** from a module, library, or project action.
- **Prerequisites:** At least one completed content item.
- **Steps:** Choose scope and available format; confirm; receive file or copied content.
- **System responses:** Show included items; generate export with project/module hierarchy, labels, and version metadata where useful.
- **Possible errors:** No eligible items, export generation failure, browser download restriction, unsupported characters. Allow retry and fallback to copy where possible.
- **Completion state:** Selected content is available outside Web Content Flow in a documented basic format.

## 10. Returning user continuing a project

- **Trigger:** Authenticated user returns to dashboard or project URL.
- **Prerequisites:** Existing project.
- **Steps:** Review last activity and status; open project; resume incomplete brief/job review or create more content.
- **System responses:** Sort by recent activity; surface next useful action; reconcile jobs that completed while absent.
- **Possible errors:** Expired session, job stuck, project archived/deleted, stale client state. Reauthenticate safely and refresh authoritative status.
- **Completion state:** User resumes from the last durable state without repeating completed work.

## 11. Handling generation errors

- **Trigger:** A generation job cannot complete or validate.
- **Prerequisites:** Existing queued or running job.
- **Steps:** Read concise error; inspect affected scope; retry, revise input, switch to mock mode if appropriate, or cancel.
- **System responses:** Mark job failed with safe error category; preserve previous content; avoid automatic repeated charges; record diagnostic ID; offer actionable next step.
- **Possible errors:** Retry also fails, provider unavailable, input blocked, quota exhausted, malformed response. Escalate guidance without exposing secrets or raw provider payloads.
- **Completion state:** Job is completed on retry, deliberately cancelled, or remains failed with project otherwise usable.

## 12. Using mock mode without an AI API key

- **Trigger:** User or environment selects mock mode, or no real provider is configured.
- **Prerequisites:** Authenticated user and valid brief; no API key required.
- **Steps:** Create project; complete brief; generate Brand Profile and modules; edit, regenerate, and export.
- **System responses:** Use schema-valid fixture/deterministic outputs; simulate short job states; label all generated content as mock; exercise the same persistence and UI paths as real generation.
- **Possible errors:** Missing fixture, schema regression, unsupported scenario. Report a product error and retain project inputs.
- **Completion state:** Entire MVP workflow is demonstrable and testable without external AI cost or connectivity.

## Cross-journey rules

- Never lose accepted content because a later generation job fails.
- Project and job state must survive refresh and sign-out.
- Duplicate primary actions must be idempotent or visibly blocked while pending.
- Errors identify the affected scope and next action, not raw technical detail.
- Mock content must never be mistaken for real-provider output.

Related: [Information Architecture](08-information-architecture.md), [Functional Modules](09-functional-modules.md), and [MVP Scope](06-mvp-scope.md).
