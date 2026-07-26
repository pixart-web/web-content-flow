# Problem and Solution

## Problem statement

Small marketing teams and independent operators need to turn business context into content for many channels. Their tools store formats, not shared intent. Users repeatedly translate the same audience, positioning, offer, and tone into new prompts and documents, creating avoidable work and inconsistent outputs.

## User problems

1. **Context repetition:** the same business and brand information must be entered in multiple tools.
2. **Channel inconsistency:** website, social, advertising, email, and video outputs use different claims, voice, and calls to action.
3. **Workflow fragmentation:** briefs, drafts, calendars, prompts, and approved assets live in separate locations.
4. **Blank-page cost:** users know their business but struggle to convert it into channel-specific structures and copy.
5. **Review overhead:** AI output is difficult to compare, revise, version, and trace when it exists in chat transcripts.
6. **Tool switching:** users pay for and coordinate several products to complete one launch or campaign.
7. **Client handoff friction:** freelancers and agencies need organized deliverables, not a history of prompts.

## Typical current workflow

1. Collect a brief in a form, email, call notes, or document.
2. Create or infer positioning and audience statements.
3. Copy context into a chatbot for each deliverable.
4. Move drafts into documents, spreadsheets, design tools, or schedulers.
5. Manually correct differences in tone, offers, and facts.
6. Track approvals and variants through filenames or duplicated documents.
7. Re-enter context when new content is needed.

This workflow is flexible but depends on individual discipline and manual reconciliation.

## Time and consistency costs

- Repeated setup delays first drafts.
- Copy-paste introduces omissions and stale context.
- Batch generation makes review harder when output is unstructured.
- Correcting one positioning decision does not reliably update future work.
- Specialists or clients may interpret the same brief differently.

Quantified savings and quality improvements are **hypotheses** and must be measured; no percentage claims should be published before validation.

## Proposed solution

Web Content Flow captures one guided project brief, uses it to generate an editable Brand Profile, and passes approved shared context into selected content modules. Each module produces structured content items that can be reviewed, edited, regenerated individually, versioned, copied, and exported.

The connected workflow is:

```text
Project Brief
    ↓
Brand Profile (shared context)
    ↓
Selected generation jobs
    ↓
Structured content items by module
    ↓
Review → edit/regenerate → reuse/export
```

## Solution boundaries

The MVP generates and organizes text, concepts, metadata, and prompts. It does not render final video, provide a professional image editor, build or host production websites, publish to social networks, replace design suites, or automate client approvals. Human review is required before publication. See [MVP Scope](06-mvp-scope.md).

## Current alternatives

| Alternative | Strength | Gap addressed by Web Content Flow |
|---|---|---|
| General AI chatbots | Flexible ideation and writing | Weak persistent structure, cross-module organization, and content lifecycle |
| Documents and spreadsheets | Familiar and editable | Manual context management and limited generation workflow |
| Point AI writing tools | Optimized templates | Often isolated by output type and weak project-wide context |
| Project management tools | Task organization | Do not generate a connected content system |
| Social scheduling platforms | Planning and publishing | Begin after strategy and content production |
| Design and website tools | Strong final production | Require prepared strategy, structure, and copy |
| Agencies or contractors | Expertise and execution | Higher cost and coordination; not a software substitute in all cases |

## Jobs to be done

### Functional jobs

- When launching a business or campaign, help me turn incomplete business information into an organized brand and content starting point.
- When producing across channels, help me keep audience, positioning, tone, and calls to action consistent.
- When delivering client work, help me organize outputs so they can be reviewed and reused.
- When one item is weak, let me improve it without regenerating or losing the rest.
- When AI access is unavailable, let me evaluate and demonstrate the complete workflow in mock mode.

### Emotional jobs

- Reduce uncertainty about what content is needed next.
- Increase confidence that deliverables belong to one brand.
- Preserve control over generated work and revisions.

### Social jobs

- Present organized, professional deliverables to clients or colleagues.
- Demonstrate a coherent campaign rationale rather than isolated AI output.

## Validation questions

- Do users value one connected workflow enough to replace or complement existing tools?
- Is the Brand Profile accurate enough to reduce repeated editing?
- Which three output modules create the strongest willingness to pay?
- Does structured generation improve usage and reuse compared with chat-based output?

Related: [Target Users and Personas](03-target-users-and-personas.md), [Success Metrics](10-success-metrics.md), and [Risks and Assumptions](11-risks-and-assumptions.md).
