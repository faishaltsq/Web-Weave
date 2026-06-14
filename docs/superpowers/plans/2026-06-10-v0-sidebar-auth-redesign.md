# v0 Sidebar Auth Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline sidebar Account card with a v0-style bottom profile menu and auth popover.

**Architecture:** Keep the redesign inside the existing single-page React component. Add one `profileMenuOpen` state, replace `renderAuthPanel` usage with a new bottom account area, and style the popover/sidebar in the existing CSS module.

**Tech Stack:** Next.js 14, React 18, CSS Modules, Supabase Auth, lucide-react icons.

---

## File Structure

- Modify: `src/app/page.js` for profile menu state, JSX, and menu interactions.
- Modify: `src/app/page.module.css` for v0-style sidebar/profile/menu visuals.
- Test: one-off PowerShell static guards plus `npm run build`.

## Task 1: Static RED Guard

- [ ] Run this before implementation:

```powershell
$page = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath "src\app\page.js")); if ($page -notmatch "renderProfileMenu") { throw "Profile menu missing" }; if ($page -match "renderAuthPanel\('sidebar'\)") { throw "Inline sidebar auth still renders" }; "profile menu guard passed"
```

Expected before implementation:

```text
Profile menu missing
```

## Task 2: React Markup

- [ ] Add `profileMenuOpen` state near existing UI state.
- [ ] Close the profile menu when auth mode changes, sign-out completes, or a new generation starts only if necessary.
- [ ] Replace `{renderAuthPanel('sidebar')}` with a bottom account area.
- [ ] Signed-out profile click shows Google, login/register, email, password, messages, and submit.
- [ ] Signed-in profile click shows `Account Settings`, `Pricing`, and `Sign Out`.

## Task 3: CSS Module

- [ ] Replace inline auth card styling in the sidebar with a fixed bottom profile shell.
- [ ] Add `sidebarScrollArea`, `sidebarAccountDock`, `profileMenu`, `profileButton`, `pricePill`, and menu item classes.
- [ ] Keep dark v0-style compact controls and visible left sidebar scroll behavior.
- [ ] Preserve responsive behavior under `1180px` and `760px` breakpoints.

## Task 4: Verification

- [ ] Run this after implementation:

```powershell
$page = [System.IO.File]::ReadAllText((Resolve-Path -LiteralPath "src\app\page.js")); if ($page -notmatch "renderProfileMenu") { throw "Profile menu missing" }; if ($page -match "renderAuthPanel\('sidebar'\)") { throw "Inline sidebar auth still renders" }; if ($page -notmatch "Account Settings") { throw "Account Settings missing" }; if ($page -notmatch "Pricing") { throw "Pricing missing" }; "profile menu guard passed"
```

Expected after implementation:

```text
profile menu guard passed
```

- [ ] Run:

```powershell
npm run build
```

Expected:

```text
Compiled successfully
```

No git commit is included because the user did not request a commit.

## Plan Self-Review

- Spec coverage: Covers bottom profile menu, signed-in menu items, signed-out auth popover, inline card removal, scroll behavior, and verification.
- Placeholder scan: Commands and expected outputs are concrete.
- Type consistency: `profileMenuOpen`, `renderProfileMenu`, and class names are consistent across tasks.
