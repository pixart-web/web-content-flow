# Accessibility and Responsive Audit

## Scope and evidence

Audited by source semantics, existing Playwright interactions, and headless Chromium geometry at 320, 375, 768, 1024, and 1440 px. Public routes tested: landing, sign-in, sign-up, forgot-password, pricing, privacy, terms, security, help, and contact. Authenticated mobile E2E covered shell navigation, Library, editors, and each module’s principal responsive surface.

This was not a complete WCAG conformance audit. No screen reader, axe scan, 200% zoom, OS reduced-motion, forced-colors, or mobile virtual keyboard session was run.

## Results

| Surface | Keyboard/semantics | Responsive result | Finding |
|---|---|---|---|
| Landing | main/nav/headings/links present | no overflow at five widths | footer text targets likely small |
| Sign-up/sign-in | labels, autocomplete, status/error roles, 44 px submit | no overflow | helper links below 44 px |
| Password recovery | wrapping labels work as accessible names; status/alert | no overflow | no dedicated E2E; helper links small |
| Onboarding/wizard | button-driven, semantic sections | Phase 2 desktop E2E; project creation mobile requirement not end-to-end | coverage gap |
| Dashboard/shell | labelled mobile drawer and keyboard test | 320 px mobile test passes | no screen-reader drawer audit |
| Brief/Brand Profile | labelled structured controls | core E2E coverage limited | long/zoom behavior unverified |
| Website/Social/Ads/Video/Copy | structured controls, copy feedback patterns | representative mobile editor tests pass | not all field/error/dialog states |
| Calendar | list-based mobile fallback evidenced | mobile test passes | exact screen-reader parity unverified |
| Library/editor/history | labelled controls and versions | mobile Library/editor passes | conflict dialogs not AT-audited |
| Export/settings/usage | semantic source review | no dedicated mobile/E2E | Medium test gap under AUD-005 |
| Legal/error states | headings and links | no public overflow | helper target sizing |

## Viewport measurements

- No horizontal overflow was detected on the ten public routes at any audited width.
- Each audited public page had exactly one `h1`.
- Visible public form controls had accessible labels after excluding framework hidden action inputs.
- Primary buttons and inputs use 44 px minimum height.
- Several text links measured 17–20 px high at 320 px. WCAG target-spacing exceptions may apply, but spacing was not formally verified (AUD-016).

## Focus, motion, contrast, and status

- Global `:focus-visible` styles exist and E2E keyboard navigation passed for the mobile shell.
- Status UI uses text/labels, not color alone.
- Form errors use `role=alert`; copy/status patterns use live feedback in editor code.
- Semantic design tokens are used consistently; the Design Foundation documents contrast. Automated contrast sampling was not performed.
- Motion guidance exists, but actual reduced-motion behavior was not exhaustively verified.

## Severity and remediation

| Item | Severity | Action |
|---|---|---|
| Phase 5/6 core surfaces lack dedicated accessibility/E2E | HIGH as part of AUD-005 | add axe-assisted smoke plus keyboard/focus tests for recovery, onboarding, export, settings |
| Small text-link hit areas | LOW / AUD-016 | enlarge padding or verify target-spacing exception |
| No screen reader/zoom/reduced-motion evidence | MEDIUM launch condition | manual WCAG 2.2 AA audit and evidence |
| Auth/reset explicit noindex | MEDIUM / AUD-011 | metadata/header correction |

## Conclusion

No confirmed inaccessible core control or horizontal-overflow blocker was reproduced. Accessibility is **partially verified**, not launch-certified. Public launch requires a formal audit and closure/acceptance of resulting blockers.

