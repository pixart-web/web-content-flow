# Content Design

## Voice rules

- Clear, direct, confident, practical, helpful, concise, and outcome-focused.
- Use sentence case and active voice.
- Name the object and scope: “Regenerate this headline,” not “Try again.”
- Lead with outcome/state, then explain the next action.
- Avoid AI hype, anthropomorphism, unsupported certainty, and provider terminology.
- Distinguish user input, generated recommendation, user edit, and mock content.

## Interface patterns

| Context | Rule | Prefer | Avoid |
|---|---|---|---|
| Navigation | Use stable nouns | `Brand Profile`, `Website`, `Library` | `AI studio`, `Magic tools` |
| Primary buttons | Verb + object/outcome | `Generate Brand Profile`, `Create campaign` | `Go`, `Submit`, `Unlock AI magic` |
| Item actions | State exact scope | `Regenerate this item`, `Copy caption` | `Regenerate`, `Copy` when scope is ambiguous |
| Empty state | Explain value, prerequisite, next action | `Create your Brand Profile to keep every module consistent.` | `Nothing here yet!` |
| Loading | Name durable operation/state | `Generating website structure…` | `Web Content Flow is thinking…` |
| Completion | State result and next step | `Your website copy is ready. Review 5 pages.` | `Success! The magic happened.` |
| Validation | State correction near field | `Enter a complete URL, including https://` | `Invalid input` |
| Error | What happened + preserved state + recovery | `This item wasn’t regenerated. Your current version is unchanged. Try again.` | `Something went wrong` alone |
| Confirmation | Describe consequence | `Restore version 2? Your current version will remain in history.` | `Are you sure?` |
| Tooltip | Add secondary clarification | `Uses the current Brand Profile for new content.` | Repeating the button label |
| Export | Name scope and format | `Export 12 selected items as Markdown` | `Publish campaign` |
| Destructive | Explicit object/consequence | `Delete project` / `This removes its brief and content.` | `Remove` without scope |

## Generation vocabulary

- Job states: `Queued`, `Generating`, `Validating`, `Ready`, `Partially complete`, `Failed`, `Cancelled`.
- Content states: `Generated`, `Edited`, `Current version`, `Mock content`.
- Do not expose model names, tokens, temperature, or internal prompt stages in ordinary UI.
- Do not claim a job is “almost done” without evidence.

## Onboarding

- Explain one concept per step and why the information improves output.
- Show required and optional clearly; do not frame optional detail as mandatory.
- Use realistic examples without pre-filling potentially false business facts.
- Progress copy describes completed steps and remaining sections, not fabricated completion percentages.

## Errors and recovery formula

```text
Short title: what failed
Sentence 1: affected scope and preserved state
Sentence 2: likely safe next action
Primary action: recovery verb + object
Secondary: return/cancel/details when useful
```

Example: **Website generation stopped.** Three completed pages are saved; the Services page was not created. **Retry Services page**.

## Destructive actions

- Use destructive color only for the destructive action, not the entire dialog.
- Require typed confirmation only for unusually high-impact/irreversible actions; it is not a default.
- Prefer reversible archive/restore patterns in future, but do not imply they exist in MVP.

## Editorial mechanics

- Use “website,” “social content,” “advertisements,” and “Video & Reels” consistently.
- Use **Brand Profile**, **project**, **generation job**, and **content item** exactly as defined in the Product Foundation.
- Write numerals for counts and steps; use locale-aware dates when implemented.
- Avoid exclamation marks in routine success and all critical states.

Related: [Brand Personality](02-brand-personality.md), [User Journeys](../07-user-journeys.md), and [Accessibility](12-accessibility.md).
