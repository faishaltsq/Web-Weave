# v0-Style Sidebar Auth Redesign

## Goal

Move authentication out of the inline sidebar card and into a v0-style bottom profile menu.

## Approved Behavior

- Sidebar top keeps a workspace identity row and `New Automation` action.
- Sidebar middle remains scrollable and contains navigation plus saved script history.
- Sidebar bottom becomes a fixed account strip with a profile button and a pricing pill.
- When signed out, clicking the profile button opens a compact authentication popover with Google sign-in, email login, and register.
- When signed in, clicking the profile button opens a menu with only `Account Settings`, `Pricing`, and `Sign Out`.
- The old inline `Account` card is removed from the sidebar.

## UI Direction

Follow the reference v0.dev sidebar language: dark, compact, left rail, rounded controls, subtle borders, bottom profile affordance, and a floating popover above the profile row.

## Implementation Notes

- Keep all changes in `src/app/page.js` and `src/app/page.module.css`.
- Reuse existing Supabase auth handlers: email/password, Google OAuth, and sign out.
- Add a small state value to toggle the profile/auth popover.
- Keep mobile sidebar behavior unchanged; the sidebar is still hidden on small screens.

## Verification

- Static guard confirms no inline `renderAuthPanel('sidebar')` remains.
- Static guard confirms profile menu labels exist.
- Production build passes with `npm run build`.
