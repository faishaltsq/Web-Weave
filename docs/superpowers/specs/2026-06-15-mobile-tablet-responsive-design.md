# Mobile Tablet Responsive Design

## Summary

WebWeave needs a whole-app mobile and tablet responsive pass. The current app already has some breakpoints, but mobile hides the sidebar entirely and several screens can feel cramped or overflow. The approved direction is a pragmatic whole-app pass with a persistent icon rail on phone and tablet, not a drawer or bottom tabs.

## Scope

Update responsive UI for these areas:

- Main app shell in `src/app/(main)/page.js` and `src/app/(main)/page.module.css`.
- Home/workspace generation layout: prompt, logs, browser preview, locator summary, quality checks, generated code.
- Built-in Chats view inside `src/app/(main)/page.js`.
- `ProjectsPage`, `ScriptsPage`, `PricingPage`, confirmation dialog, settings modal, and pricing modal responsive fit.

Do not change generation behavior, auth, billing, Supabase data flow, project/script APIs, Midtrans routes, or saved data structures.

## Navigation Design

Use a persistent icon rail across tablet and mobile:

- Tablet (`761px-1180px`): keep compact sidebar/icon rail behavior with enough width for touch targets.
- Mobile (`<=760px`): do not hide navigation completely. Use a slim fixed left rail around `64px` wide.
- Main content reserves space for the rail so content does not sit underneath it.
- Hide long labels on constrained widths; keep icons visible with `title` and accessible labels.
- Keep critical actions reachable: Home, Projects, Chats, Automation Scripts, new automation, theme/profile/settings.
- Avoid adding a slide drawer or bottom navigation in this pass.

## Layout Design

Use responsive media queries and existing CSS modules instead of a full component rewrite:

- Use `dvh`/safe viewport sizing where fixed-height panels currently rely on `100vh`.
- Prevent horizontal overflow at app shell and page level.
- On mobile, stack prompt/result areas vertically and let panels scroll naturally.
- Preview, logs, code, and cards become full-width on mobile.
- Tablet layouts can keep two columns where content has enough width; otherwise stack.
- Buttons wrap cleanly and become full-width when width is constrained.
- Modals fit within the viewport and scroll internally.

## Page-Specific Requirements

### Home / Workspace

- Hero composer fits phone width without clipping URL/framework/project controls.
- Workspace header remains usable on small screens.
- Prompt rail and workspace panel stack without trapping content in unusable fixed heights.
- Logs, browser preview, locator summary, quality checks, and code panel remain readable.

### Chats

- Header actions stack on mobile.
- Search input and new automation button fit full width.
- Chat rows avoid overflow from long titles, previews, timestamps, and action icons.

### Projects

- Project cards use one column on mobile and sensible columns on tablet.
- Create/search actions wrap and stay touch-friendly.

### Scripts

- Summary cards, script cards, and action buttons stack cleanly on mobile.
- Remove/import/run actions stay visible without causing horizontal scroll.

### Pricing

- Pricing summary and cards fit mobile width.
- CTA buttons wrap text rather than overflow.
- Pricing modal uses internal scrolling and reachable close button.

## Verification

Add a lightweight verification script that checks responsive CSS guardrails exist, including:

- Mobile media query keeps navigation available instead of hiding it completely.
- Main content accounts for mobile rail width.
- Workspace/panel mobile rules avoid fixed `100vh` traps by using `100dvh`, `min-height`, or overflow rules that allow content to scroll.
- Key page CSS modules retain mobile one-column/wrapping rules.

Run:

- `node scripts/verify-mobile-tablet-responsive.mjs`.
- `npm run build`.

Manual viewport inspection should cover:

- `375px` phone width.
- `768px` tablet width.
- `1024px` tablet/compact desktop width.

## Non-Goals

- No new design system.
- No full sidebar component extraction in this pass.
- No bottom tabs or slide drawer.
- No changes to backend behavior or persisted data.
