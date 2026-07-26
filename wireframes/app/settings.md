# Settings Wireframe

**Screen purpose:** Manage approved account/generation or project configuration.  
**Routes:** `/app/settings`; `/app/projects/:projectId/settings`

## Desktop

```text
┌──────────────┬──────────────────────────────────────────────────────┐
│ Shell        │ Settings                                             │
│ Account ●    │ Account: Display name / provider-managed password   │
│              │ Generation: Mock | Real (availability explained)    │
│              │ Provider key section only if required               │
│              │ Output language default (optional)                  │
│              │ [Save changes]                                      │
│              │ Danger zone: Delete account* | Sign out             │
└──────────────┴──────────────────────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Menu Settings            │
│ Account                  │
│ Display name [_________] │
│ Generation mode         │
│ (•) Mock  ( ) Real      │
│ [Save changes         ]  │
│ Danger zone             │
│ Delete account*         │
│ Sign out                │
└──────────────────────────┘
```

## Regions and components

Sectioned forms, mode controls, conditional secret input, save status, provider links, destructive zone/dialog. Project variant uses identity/modules/deletion.

## Interaction notes and states

Mode availability explicit; keys never redisplayed. Module removal retains content unless explicit deletion. Deletion only if policy/implementation approved and confirmed.

## Acceptance criteria

No Billing/Team/Integrations/API pages; mock clear; provider behavior conditional; mobile/keyboard complete. See [Settings spec](../../docs/ux/22-settings.md).
