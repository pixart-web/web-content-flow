# Authentication Flow

## Screen specification

- **Screen names/routes:** Sign in `/sign-in`; Sign up `/sign-up`; Password recovery is a state of `/sign-in` or provider-hosted if required.
- **Purpose/goal:** Establish or recover a secure single-user session and continue to intended work.
- **Entry/exit:** Public CTAs, protected-route redirect, expired session → `/app` or validated `returnTo`; sign out → `/sign-in`.
- **Required data:** Email, password, consent where required; return path; provider verification state.
- **Hierarchy:** logo → title/help → form → primary action → alternate auth link → policy links.
- **Desktop:** centered 400–480 px card; **tablet/mobile:** full-width within 24/16 px gutters, no split promotional panel required.
- **Primary actions:** `Sign in`, `Create account`, `Send recovery link`; **secondary:** switch flow, retry verification if provider requires.
- **Components:** labelled inputs, password reveal button, validation summary, status alert, button, links.
- **States:** default; empty inputs; session-check loading; submission loading; verification partial; success redirect; safe provider/credential error.
- **Security:** no account-existence disclosure in recovery; sanitized internal return path only; rate-limit messages; password never logged; server authorization remains authoritative.
- **Accessibility:** autocomplete attributes, visible labels, logical focus, error association, status announcement, reveal button name/state.
- **Analytics:** `sign_up_started`, `account_created`, `sign_in_completed`, `password_recovery_requested`; never password/email value.
- **Acceptance:** keyboard completion; duplicate submission blocked; credentials preserved only where safe; expired session returns after sign-in.
- **Out of scope:** social login, SSO, organizations, teams, role selection.

## Workflow

- **Trigger/prerequisites:** visitor chooses auth or protected route redirects; signed out.
- **Main path:** enter valid credentials → submit → provider success → establish session → safe intended route or `/app`.
- **Alternative:** sign up creates account; email verification occurs only if provider requires it; recovery sends generic confirmation.
- **Failure paths:** invalid credentials, duplicate email, weak password, expired verification, rate limit, offline/provider outage, unsafe return path.
- **Recovery:** field-specific correction; resend/try later; preserve email where safe; current application data unaffected.
- **Completion/persistence:** durable provider account and session cookie/token according to provider; no local secret storage.
- **Navigation after completion:** intended protected route takes priority, otherwise onboarding/empty dashboard.
- **Session expiry:** preserve intended current URL and unsaved local draft when safe; show `Your session expired. Sign in to continue.`
- **Sign out:** explicit account-menu action; clear session, sensitive cached data, and redirect.

Wireframes: [Sign in](../../wireframes/auth/sign-in.md), [Sign up](../../wireframes/auth/sign-up.md), [Recovery](../../wireframes/auth/password-recovery.md).
