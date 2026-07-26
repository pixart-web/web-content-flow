# Experience Principles

| Principle | Meaning | UX implication | Positive example | Anti-pattern | Acceptance test |
|---|---|---|---|---|---|
| Project context before generation | Useful output begins with durable business context | Require a sufficiently complete brief and current Brand Profile before modules generate | Module action explains missing Brand Profile | Blank prompt box on module landing | A new user cannot accidentally generate context-free content |
| One shared Brand Profile | New jobs use one current version | Show profile version/provenance on content and warn after profile changes | “Uses Brand Profile v3” | Separate tone settings per module | Cross-module jobs reference the same selected profile version |
| User controls content | Generation proposes; user chooses | Edit, copy, regenerate, restore, and export are explicit | Regenerate one item; prior version retained | Full pack silently replaced | Regeneration changes only chosen scope and creates a version |
| Visible durable jobs | Work may continue while generation runs | Status persists in shell and project; navigation remains available | User visits Brief while Website runs | Blocking full-screen loader | Refresh/return restores authoritative job state |
| Progressive complexity | Defaults precede optional controls | Wizard steps essential context first; advanced options are contextual | Optional references grouped in Brand direction | One long configuration page | First project can be created without touching optional fields |
| Outcomes over AI terms | Users choose work, not mechanisms | Labels name deliverables and actions | `Generate Brand Profile` | Model/temperature selector in primary flow | Primary screens contain no provider jargon |
| Structured content | Content is fields/items, not chat | Module-specific cards and labelled editors | Caption, CTA, hashtags as fields | Assistant/user message bubbles | Every saved output validates to a visible content structure |
| Resilient recovery | Failures are scoped and non-destructive | Preserve inputs/content; explain recovery | “Services page failed; 3 pages saved” | “Oops” and blank results | Failed job leaves other content available |
| No hidden destruction | Consequences are explicit | Confirm deletion/restore effects; warn on unsaved navigation | “Current version remains in history” | Clicking regenerate overwrites edits | Destructive action names object and consequence |
| Honest progress | State reflects known facts | Use meaningful stages or indeterminate status | `Validating output` | “87% complete” from elapsed time | No percentage appears without measurable completed units |
| Mock is unmistakable | Fixtures must not be confused with live output | Persistent shell badge and item label | `Mock mode · Content is sample output` | One-time toast | Mock label remains visible after navigation/export selection |
| Calm continuity | Orientation survives complexity | Stable shell, clear project identity, one primary action per region | Active project/module stays visible | Animated dashboard full of counters | User can identify project, section, and next action at a glance |

Related: [Product Principles](../05-product-principles.md), [Generation System](11-generation-system.md), and [UX Acceptance Checklist](28-ux-acceptance-checklist.md).
