# Generation Sequence

```mermaid
sequenceDiagram
  actor User
  participant App as Next.js application
  participant Auth as Authorization
  participant Gen as Generation service
  participant DB as PostgreSQL
  participant Worker
  participant AI as OpenAI or mock

  User->>App: Generate scoped content
  App->>Auth: require resource owner
  Auth-->>App: authorized project
  App->>Gen: enqueue(validated command, idempotency key)
  Gen->>DB: persist QUEUED job
  DB-->>App: job ID/state
  App-->>User: accepted; navigation remains available
  Worker->>DB: lease eligible job
  Worker->>AI: structured request + schema/version
  AI-->>Worker: candidate output / safe error
  Worker->>Worker: Zod validate/normalize
  Worker->>DB: transaction: immutable version + current pointer + job terminal
  User->>App: poll status
  App->>Auth: require job owner
  App->>DB: compact job/result status
  App-->>User: ready/partial/failed + actions
```

Retries occur only within bounded worker policy. Invalid/safety/input failures do not loop. See [Job Architecture](../../docs/technical/10-generation-job-architecture.md).
