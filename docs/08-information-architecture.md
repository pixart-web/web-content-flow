# Information Architecture

## IA goals

- Keep the project and Brand Profile central.
- Separate public acquisition pages from the authenticated workspace.
- Make module status and next actions visible without exposing AI implementation details.
- Support direct URLs to durable project sections and content items.

## Public website navigation

```text
Web Content Flow
├── Product
│   ├── How it works
│   ├── Use cases
│   └── Modules
├── Pricing (when defined)
├── Resources / Help (minimal at MVP)
├── Sign in
└── Create account
```

MVP marketing navigation may be a single page with anchored sections. Do not build a content-heavy marketing CMS before validation.

## Authenticated application navigation

Primary desktop navigation:

```text
Global shell
├── Dashboard
├── Projects
├── Library (optional global entry; project-first at MVP)
└── Settings
```

Secondary navigation appears inside a project and contains Overview, Brief, Brand Profile, Content modules, Calendar, and Library.

## Dashboard structure

```text
Dashboard
├── Header: greeting/account + Create project
├── Continue: recent or incomplete project
├── Projects: cards/list
│   ├── project name and brand
│   ├── project type
│   ├── setup/generation status
│   ├── selected module summary
│   └── last activity
└── Empty state: value explanation + Create first project
```

Search, sorting, and advanced filtering are not required until project volume demonstrates need.

## Project workspace structure

```text
Project workspace
├── Overview
│   ├── next action
│   ├── brief/profile readiness
│   ├── generation-job status
│   └── recent content items
├── Brief
├── Brand Profile
├── Content
│   ├── Website
│   ├── Social
│   ├── Ads & Creative
│   ├── Video & Reels
│   └── General Copy
├── Calendar
├── Library
└── Project actions
    ├── Export
    └── Project settings
```

Content modules not selected in the wizard remain discoverable but show a purposeful “Add module” state rather than cluttering the main workflow.

## Module hierarchy

```text
Module
├── Module overview and generation controls
├── Generation jobs
└── Content-item collection
    └── Content item
        ├── structured fields
        ├── current status
        ├── edit/copy/regenerate actions
        ├── Brand Profile provenance
        └── version history
```

The calendar organizes references to content items; it does not create a separate copy of their content. The library indexes content items and relevant reusable brand assets such as prompts, palettes, and message blocks.

## Recommended URL structure

```text
/
/product
/pricing
/sign-in
/sign-up
/app
/app/projects
/app/projects/new
/app/projects/:projectId
/app/projects/:projectId/brief
/app/projects/:projectId/brand-profile
/app/projects/:projectId/content/website
/app/projects/:projectId/content/social
/app/projects/:projectId/content/ads
/app/projects/:projectId/content/video
/app/projects/:projectId/content/copy
/app/projects/:projectId/content/:module/:itemId
/app/projects/:projectId/calendar
/app/projects/:projectId/library
/app/projects/:projectId/settings
/app/settings
```

Use opaque IDs in URLs. Human-readable slugs may be added later but must not be authorization controls.

## Navigation behavior

- **Primary navigation:** changes global context: Dashboard/Projects and Settings.
- **Secondary navigation:** changes section within the active project.
- **Contextual navigation:** breadcrumbs or back links connect item detail to its module/library.
- **Persistent project identity:** project and brand name remain visible inside the workspace.
- **Status visibility:** active generation jobs remain accessible across project sections.
- **Unsaved edits:** navigation warns before losing changes or uses reliable autosave.

## Mobile considerations

- Treat mobile as a functional responsive experience, not a native application.
- Collapse global navigation into a menu and project navigation into a section selector/drawer.
- Keep current project and generation status visible.
- Stack content cards and prioritize review, light editing, copying, and job monitoring.
- Long structured editing and full brief completion may be more efficient on desktop, but must not be blocked on mobile.
- Avoid horizontal tables; convert status tables to cards.
- Preserve minimum touch targets, keyboard behavior, and readable previews.

## Access and state considerations

- Signed-out users visiting `/app/*` return to the intended URL after authentication.
- Unauthorized project IDs show a neutral not-found/access state without leaking project existence.
- Loading the project shell should not wait for every module collection.
- Deep links restore the active project and section.
- Archived/deleted behavior is a later detail; destructive deletion must require confirmation if included.

Related: [User Journeys](07-user-journeys.md) and [Functional Modules](09-functional-modules.md).
