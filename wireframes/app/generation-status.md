# Generation Status Wireframe

**Screen purpose:** Monitor and recover project/module/item generation without blocking navigation.  
**Route:** Overlay from project shell; jobs link to canonical result routes

## Desktop

```text
┌──────────────────────── Page remains usable ────────────────────────┐
│                                           ┌─ Generation status ───┐ │
│ Header: Project                  [Jobs 2]  │ Website · Running     │ │
│                                           │ Creating page copy    │ │
│ Main routed content                       │ [Open module] [Cancel]│ │
│                                           │ Social · Partial      │ │
│                                           │ 8 ready, 2 failed     │ │
│                                           │ [Review] [Retry 2]    │ │
│                                           └───────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Close Generation status  │
│ Website · Running        │
│ Creating page copy       │
│ [Open module] [Cancel]   │
│ Social · Partial         │
│ 8 ready, 2 failed        │
│ [Review] [Retry 2]       │
└──────────────────────────┘
```

## Regions and components

Header trigger/count, status drawer, job rows, meaningful step, scope, actions, safe error detail, mock badge.

## Interaction notes and states

Preparing/queued/running/partial/complete/failed/cancelled/retrying/mock. No fake percentage. Closing never cancels. Return/refresh reconciles durable state; toasts are supplemental.

## Acceptance criteria

Navigation remains available; failures scoped; duplicate request blocked; live announcements throttled. See [Generation spec](../../docs/ux/11-generation-system.md).
