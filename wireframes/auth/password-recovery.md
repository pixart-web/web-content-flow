# Password Recovery Wireframe

**Screen purpose:** Request provider-supported account recovery without revealing account existence.  
**Route:** `/sign-in` recovery state or provider-hosted if required

## Desktop

```text
┌──────────────────────────────────────────┐
│ Logo                                     │
│ Recover access                           │
│ Enter your account email.                │
│ Email [______________________________]   │
│ [Send recovery link]                     │
│ Back to sign in                          │
│ [Generic confirmation/error]             │
└──────────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Logo                     │
│ Recover access           │
│ Email [________________] │
│ [Send recovery link   ]  │
│ Back to sign in          │
└──────────────────────────┘
```

## Regions and components

Heading, explanation, email input, primary button, back link, status alert.

## Interaction notes and states

Always confirm generically: `If an account matches that email, recovery instructions have been sent.` Rate-limit/offline recovery is safe. Provider owns reset form when applicable.

## Acceptance criteria

No existence disclosure; button prevents duplicate requests; status announced; no custom password system assumed. See [Authentication flow](../../docs/ux/03-authentication-flow.md).
