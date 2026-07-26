# Video & Reels Module

## Screen specification

- **Screen/route:** Video & Reels `/app/projects/:projectId/content/video`; item `/content/video/:itemId`.
- **Purpose/goal:** Generate production-ready planning scripts without implying rendered video or timeline editing.
- **Entry/exit/data:** Overview/nav → script/editor/export; profile, platform/duration/objective, scripts/scenes, jobs/versions.
- **Hierarchy:** module header → script collection → selected script overview → ordered scene list → production notes/CTA.
- **Desktop:** script list + main scene document; **tablet:** selector + content; **mobile:** stacked script cards and full-screen detail.
- **Primary:** `Generate scripts`; **secondary:** generate one, edit/regenerate script or supported scene, copy/export, versions.
- **Components:** script card, metadata badges, ordered scene cards, labelled text fields, status.
- **States:** empty setup; loading; partial scripts/scenes; complete; failed with retained scripts; mock; stale-profile provenance.
- **Security/accessibility/analytics:** owner-only; ordered list semantics; duration is text estimate; module/item events.
- **Acceptance:** every script exposes hook, scenes, CTA and profile version; no playable renderer/timeline controls.
- **Out of scope:** video/audio rendering, timeline editor, stock licensing, voice generation, publishing.

## Content model/workflow

Script: title, platform, estimated duration, objective, hook, CTA, caption optional. Scene: order/time estimate, action, on-screen text, voice-over/dialogue, visual direction, camera direction, transition suggestion, music suggestion, visual prompt. Generate → validate ordered scenes → save item; partial script must be explicitly incomplete. Regeneration creates a version and retains old script.

Wireframe: [Video module](../../wireframes/app/video-module.md).
