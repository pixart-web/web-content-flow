# Empty, Loading, and Error States

## Cross-screen rules

- First-use empty explains purpose and one next action; filtered empty clears filters; unsupported boundary explains what MVP does instead.
- Skeletons represent initial layout; generation uses durable status.
- Error copy: scope → preserved state → recovery. Never use “Oops.”
- Unauthorized/not found use neutral wording: `This project isn’t available.`
- Offline save failures preserve drafts. Mock mode is persistent, not an error.

## State inventory

| Screen/module | First/filtered empty | Loading/queued/running | Partial/complete | Error/recovery | Mock/boundary copy |
|---|---|---|---|---|---|
| Auth | `Sign in to continue.` | `Signing you in…` | Redirect | `We couldn’t sign you in. Check your details and try again.` | Social/SSO not shown |
| Dashboard | `Create your first project from one brief.` | `Loading projects…` | Loaded cards | `Projects couldn’t be loaded. Retry.` | Badge: `Mock mode` |
| Wizard | Blank labelled fields | `Saving draft…` | `Draft saved` | `This step couldn’t be saved. Your entries are still here.` | `Mock mode uses sample generation.` |
| Overview | `Complete your brief to start.` | Per-module queued/running | `Some modules are ready` / content available | `Website generation failed. Other project content is unchanged.` | `Mock-generated content` |
| Brief | `Continue your project brief.` | Section skeleton / Saving | Saved | `Changes couldn’t be saved. Retry before leaving.` | Not applicable |
| Brand Profile | `Generate your Brand Profile to keep modules consistent.` | Preparing/Generating/Validating/Saving | Valid sections usable only if profile marked partial; `Brand Profile ready` | `Brand Profile wasn’t generated. Your brief is saved.` | `Mock Brand Profile` |
| Website | `Generate website structure and copy.` | named steps | `3 pages ready; 1 failed` / `Your website copy is ready` | `Services page couldn’t be generated. Retry Services page.` | `Copy only—no website builder or publishing.` |
| Social | `Generate your first social content pack.` / `No content matches these filters.` | batch status | valid posts usable | `2 posts couldn’t be generated. Retry failed posts.` | `Planning only—no social publishing.` |
| Ads | `Create a campaign to generate concepts.` | concept status | concepts/variations available | `Variation B wasn’t created. Existing concepts are unchanged.` | `Concept and prompt only—no rendered ad/image.` |
| Video | `Generate your first scripts.` | script stages | completed scripts usable | `One script couldn’t be generated. Retry it.` | `Script planning only—no video rendering.` |
| Copy | `Choose a copy category.` / filtered empty | item/variant status | copy ready | `This version wasn’t created. Current copy is unchanged.` | Not a chatbot/email sender |
| Calendar | `Add generated content to plan dates.` / no filter matches | `Loading calendar…` | references loaded | `Date change wasn’t saved. The previous date remains.` | `Scheduled is planning only. Nothing is published automatically.` |
| Library | `Generated content and brand assets will appear here.` | `Loading library…` | groups loaded | `Library items couldn’t be loaded. Retry.` | Not a full asset manager |
| Item editor | No item → not found | Saving/regenerating | `Changes saved`; `Previous version retained` | `Changes couldn’t be saved. Your draft is still here.` | `Mock content` label |
| Versions | `This item has one version.` | Loading/restoring | restored snapshot current | `Version wasn’t restored. Current content is unchanged.` | No collaborative diff/branching |
| Export | `There is no completed content to export.` | Preparing file | `Export ready` | `Export couldn’t be created. Retry or copy content.` | Mock notice; no PDF/DOCX/ZIP promise |
| Settings | Defaults | Saving | `Settings saved` | `Settings couldn’t be saved.` | Unsupported Billing/Team/Integrations absent |

## Network, unauthorized, and unsupported

- Offline banner: `You’re offline. Unsaved changes will remain on this device until you reconnect.` Do not claim durable save until confirmed.
- Project access: `This project isn’t available. It may have been deleted or you may not have access.` Actions: `Back to projects`, optional Retry.
- Route not found: `This page isn’t available.`
- Provider unavailable: `Generation is temporarily unavailable. Your project and existing content are safe.`
- Publishing boundary: `Web Content Flow prepares and organizes content. Publishing is not included in the MVP.`

Related: [Content Design](../design/14-content-design.md) and [Generation System](11-generation-system.md).
