# Content Calendar

## Screen specification

- **Screen/route:** Calendar `/app/projects/:projectId/calendar`.
- **Purpose/goal:** Plan dates/status for references to existing content items.
- **Entry/exit:** project nav/social item/add-to-calendar → linked item/module.
- **Required data:** calendar references, current item metadata, date/status/channel, timezone, filters, unscheduled eligible items.
- **Hierarchy:** title/boundary note → view/filter controls → date/list content → unscheduled panel.
- **Default recommendation:** list/agenda first for MVP; optional desktop month view only if feasible. Mobile always list-first.
- **Desktop:** list or month + unscheduled side panel; **tablet:** week/list; **mobile:** agenda grouped by date.
- **Primary:** `Add content`; **secondary:** change date/status, open item, remove calendar reference.
- **Components:** date groups/calendar cells, reference cards, status select, filters, empty state.
- **States:** empty; filtered empty; loading; partial item metadata; success; failed update with prior durable state; offline.
- **Security/accessibility/analytics:** owner-only; keyboard alternatives to drag (drag not required); dates/status text; calendar events without content.
- **Acceptance:** body is not duplicated; removing reference does not delete item; mobile can review/change date.
- **Out of scope:** auto-publishing, external calendar/scheduler sync, recurring schedules.

## Status semantics

`idea`, `draft`, `approved`, `scheduled`, `published`. `Scheduled` is planning only. `Published` is manually recorded and does not verify external publication. Display this boundary near filters/status help.

## Workflow

From item choose Add to calendar → choose date/status → create reference. Alternative select unscheduled item from Calendar. Save failure retains previous date and shows retry. Opening reference deep-links to canonical item; browser Back returns to Calendar context.

Wireframe: [Calendar](../../wireframes/app/calendar.md).
