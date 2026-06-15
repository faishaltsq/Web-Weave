# Scripts UI-First Design

## Goal

Add a `Scripts` menu to WebWeave that presents a paid-only cloud automation script library before real cloud execution is implemented.

## Product Decision

Ship UI first. Cloud execution remains marked as coming soon until sandbox, timeout, logging, and abuse controls are designed and implemented safely.

## Why UI First

- Generated scripts may run untrusted browser automation code.
- Safe cloud execution needs sandboxing, run timeouts, network controls, and credential handling.
- Vercel serverless is not ideal for long-running browser execution.
- UI-first validates paid-user demand without promising unsafe execution.

## Navigation

Add `Scripts` to sidebar navigation between `Chats` and `Templates`.

Routes/views:

- `/scripts` maps to the new Scripts view inside the current SPA shell.
- Existing views keep current behavior.

## Access Rules

- Free users see a locked Scripts page with upgrade CTA.
- Starter users can manage up to 5 cloud-ready script slots.
- Pro users can manage up to 12 cloud-ready script slots.
- Team remains future/disabled.

## Recommended Limits

- Starter: 5 slots.
- Pro: 12 slots.

Reason: 12 gives Pro a clear upgrade value over Starter without committing to high future runner cost before infrastructure cost is known.

## Scripts Page UI

Header:

- Title: `Scripts`
- Subtitle: paid cloud automation library.
- Slot usage pill: `3/5 slots used` or `3/12 slots used`.
- CTA: `Browse Chats`.

Free state:

- Locked hero card.
- Copy explains Scripts is a paid feature.
- Buttons: `Upgrade to Starter`, `View pricing`.

Paid state:

- Summary strip with plan, slots, cloud runner status.
- Script cards based on saved generated scripts.
- Each card shows domain/name, framework, status, generated date, and short prompt preview.
- Actions: `View code`, `Run in Cloud`.
- `Run in Cloud` is disabled with `Coming soon` label.

Empty paid state:

- Explains saved scripts from Chats can become cloud-ready scripts.
- CTA: `New Automation` and `Browse Chats`.

## Cloud Runner Placeholder

The UI must be honest:

- Use `Run in Cloud` button but disabled.
- Show copy: `Cloud execution is being prepared. Save scripts now, run them later.`
- Do not simulate successful execution.
- Do not call a runner API yet.

## Data Model for UI-First Phase

Use existing `generated_scripts` data only.

No new database table is required for first UI version.

Slot usage is calculated from saved scripts shown as cloud-ready candidates:

- Count saved scripts from current user.
- Display cap based on plan.
- If count exceeds cap, show first N as within slots and the rest as locked overflow.

For the UI-first phase, there is no separate import action. `Browse Chats` routes to existing saved chats. Persistent script-slot selection is deferred until real cloud execution work starts.

Future real-run phase may add:

- `script_runs`
- `cloud_script_slots`
- run logs, screenshots, status, duration, and error output.

## Components

- `ScriptsPage`: paid/free states, script grid, plan limit cards.
- Existing main page route switch adds `scripts` active view.
- Existing `PricingPage` opens when Free user clicks upgrade CTA.

## Error Handling

- If user is signed out, show sign-in prompt.
- If Supabase is not configured, show setup-disabled state.
- If scripts are loading, show loading state.
- If paid user reaches slot cap, show upgrade hint instead of allowing more cloud-ready slots.

## Testing

- Static verification for sidebar `Scripts` nav item.
- Static verification for plan limits: Starter 5, Pro 12.
- Build verification with `npm run build`.
