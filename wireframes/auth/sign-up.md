# Sign Up Wireframe

**Screen purpose:** Create a single-user account.  
**Route:** `/sign-up`

## Desktop

```text
┌──────────────────────────────────────────┐
│                  Logo                    │
│ Create your account                      │
│ Email       [________________________]    │
│ Password    [__________________] [Show]  │
│ Requirements / consent where required   │
│ [Create account]                         │
│ Already have an account? Sign in         │
│ [Verification/status region]             │
└──────────────────────────────────────────┘
```

## Mobile

```text
┌──────────────────────────┐
│ Logo                     │
│ Create your account      │
│ Email [________________] │
│ Password [________] Show │
│ Requirements             │
│ [Create account       ]  │
│ Sign in                  │
└──────────────────────────┘
```

## Regions and components

Same auth primitives as sign-in; terms links and verification notice only when required.

## Interaction notes and states

Validate on blur/submit. Duplicate email and weak password are actionable. Provider verification appears only if required. Success goes to first-use `/app`.

## Acceptance criteria

No team/org/social fields; repeated submit creates one account; mobile keyboard/focus usable; errors preserve safe values. See [Authentication flow](../../docs/ux/03-authentication-flow.md).
