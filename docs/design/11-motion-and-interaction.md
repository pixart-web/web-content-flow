# Motion and Interaction

## Principles

1. Motion explains cause, continuity, hierarchy, or state.
2. Feedback begins immediately, even when the operation is asynchronous.
3. Stable layouts matter more than animated novelty.
4. Generation progress is honest: use known stages or indeterminate state, never fabricated percentages.
5. Every animation has a reduced-motion alternative.

## Duration scale

| Token | Duration | Use |
|---|---:|---|
| instant | 0 ms | Reduced motion/state swap |
| fast | 120 ms | Hover, pressed, color/border |
| normal | 180 ms | Tooltip, small disclosure, toast |
| moderate | 240 ms | Modal/drawer, card reflow |
| slow | 360 ms | Marketing flow sequence, limited onboarding |

Avoid interface animations beyond 400 ms. Loading duration is operational, not an animation token.

## Easing

- Standard: `cubic-bezier(0.2, 0, 0, 1)`.
- Enter: `cubic-bezier(0, 0, 0.2, 1)`.
- Exit: `cubic-bezier(0.4, 0, 1, 1)`.
- Emphasized: `cubic-bezier(0.2, 0.8, 0.2, 1)` for rare marketing flow.
- No elastic/bounce easing in the application.

## Interaction patterns

- **Hover:** 1–2 px perceived lift through shadow/border, not large translation. No hover-only information.
- **Buttons:** color/shadow responds in 120 ms; pressed state may translate 1 px down; loading locks duplicate action but retains label.
- **Page transitions:** shell persists; content uses a 120–180 ms opacity transition only when it aids orientation. No route-wide slide choreography.
- **Modal:** backdrop fades; surface enters with 8 px translate + opacity over 180–240 ms.
- **Drawer:** translate from its edge over 240 ms; background does not scale.
- **Card entrance:** use only for first marketing reveal or newly created item; 8–12 px and 180–240 ms; do not stagger long lists.
- **Loading:** skeleton for initial unknown layout; spinner for short local action; status card for generation job.
- **Generation progress:** transition labelled stages such as Queued → Generating Brand Profile → Validating → Ready. Module pack statuses update independently.
- **Success:** check/status transition and direct message; no confetti by default.
- **Error:** immediate stable error surface; no shake. Move focus to summary only on submit when necessary.

## Marketing product flow

The hero may animate one brief card feeding a Brand Profile, then revealing aligned module cards. Use a 4–6 second sequence with user pause control if it loops; pause when off-screen. Lines should draw in one direction with no particles. The static first frame must communicate the concept.

## Reduced motion

Under `prefers-reduced-motion: reduce`:

- set interface transitions to 0–80 ms fades;
- disable translate, parallax, auto-scrolling, shimmer, and path-drawing;
- show all hero flow stages statically or advance by discrete user action;
- retain spinners only if a static “Loading” label is also present, preferably use a nonrotating status icon;
- never remove state feedback.

Related: [Accessibility](12-accessibility.md), [Marketing Website Direction](15-marketing-website-direction.md), and [Design Tokens](17-design-tokens.md).
