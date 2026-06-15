# Confirmation Dialog Design

## Goal

Replace native browser confirmation popups with WebWeave-styled confirmation UI for destructive actions.

## Scope

- Replace `confirm()` in project delete.
- Replace `confirm()` in plan cancel.
- Add confirmation before chat and recent chat delete, which currently delete immediately.
- Keep existing deletion and cancellation API behavior unchanged.

## Approach

Use one reusable client component, `ConfirmDialog`, for all destructive confirmations. Callers own open/close state and pass copy, variant, and callback.

## UI Behavior

- Dialog appears over dimmed page overlay.
- User can choose `No` to close without side effects.
- User can choose destructive action button to run callback.
- Destructive button uses red styling.
- Non-destructive close uses secondary styling.
- Dialog supports loading state while async action runs.

## Confirmations

- Delete project: warns that project and scripts will be deleted.
- Delete chat/recent chat: warns saved script will be deleted.
- Cancel plan: warns paid plan will switch to Free.

## Localization

Copy lives in existing i18n translations for English and Indonesian.

## Testing

- Search source for remaining `confirm(`, `alert(`, and `prompt(`.
- Run `npm run build`.
- Manually verify each destructive action opens dialog before API call.
