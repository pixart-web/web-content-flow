# Data Flow Map

```mermaid
flowchart TD
  V["Visitor"] --> M["Marketing website"]
  M --> B["Private-beta form"]
  B --> DB["PostgreSQL"]
  U["Authenticated user"] --> A["Web application"]
  A --> DB
  A --> J["Durable generation job"]
  J --> W["Worker"]
  W --> P["Mock or approved AI provider"]
  P --> W
  W --> DB
  A --> E["Transactional email provider"]
  A --> O["Operational logs / monitoring"]
  DB --> R["Managed backup / restore"]
```

Personal data enters through accounts, recovery and beta interest. Customer content enters through Briefs and edits. Only necessary generation context should reach the AI provider. Logs and analytics must never contain full Briefs, prompts, generated snapshots, passwords, tokens or beta-form free text.

Monitoring, managed backups, external email and real AI flows are proposed or locally implemented but not externally verified.
