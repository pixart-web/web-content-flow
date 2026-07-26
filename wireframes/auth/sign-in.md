# Sign In Wireframe

**Screen purpose:** Establish a session and return to intended route.  
**Route:** `/sign-in`

## Desktop

```text
┌──────────────────────────────────────────┐
│                  Logo                    │
│ Sign in                                  │
│ Email     [________________________]      │
│ Password  [____________________] [Show]  │
│ [Sign in]                                │
│ Forgot password?                         │
│ New to Web Content Flow? Create account  │
│ [Inline error/status region]             │
└──────────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Logo                     │
│ Sign in                  │
│ Email                    │
│ [______________________] │
│ Password                 │
│ [________________] Show  │
│ [Sign in              ]  │
│ Forgot password?         │
│ Create account           │
└──────────────────────────┘
```

## Regions and components

Brand link, heading, labelled inputs, reveal icon button, primary button, auth links, validation/status alert.

## Interaction notes and states

Submit disables duplicate request and retains label. Invalid credentials use safe generic message; expired session context explains return. Loading: `Signing you in…`; success redirects; provider/offline error supports retry.

## Acceptance criteria

Autocomplete, keyboard, error association, safe `returnTo`, no social login, no account-existence leak. See [Authentication flow](../../docs/ux/03-authentication-flow.md).
