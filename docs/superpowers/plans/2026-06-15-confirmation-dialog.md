# Confirmation Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace browser confirmation popups and direct destructive clicks with WebWeave-styled yes/no confirmation dialogs.

**Architecture:** Add one reusable client `ConfirmDialog` component and small CSS module. Each destructive flow keeps local pending state, opens the dialog, and performs the existing async API action only after confirmation.

**Tech Stack:** Next.js App Router, React client components, CSS modules, lucide-react icons, existing WebWeave i18n context.

---

## File Structure

- Create `src/components/ConfirmDialog.js`: Reusable confirmation modal with title, message, cancel label, confirm label, loading state, and destructive variant.
- Create `src/components/ConfirmDialog.module.css`: Shared overlay/card/button styling.
- Modify `src/components/ProjectsPage.js`: Replace native `confirm()` with dialog state.
- Modify `src/components/PricingPage.js`: Replace native `confirm()` with dialog state.
- Modify `src/app/(main)/page.js`: Add confirmation before chat/recent-chat delete.
- Modify `src/lib/i18n/translations.js`: Add EN/ID dialog labels.

## Task 1: Add Reusable Dialog

**Files:**
- Create: `src/components/ConfirmDialog.js`
- Create: `src/components/ConfirmDialog.module.css`

- [ ] **Step 1: Create component**

```jsx
'use client';

import { AlertTriangle, Loader, X } from 'lucide-react';
import styles from './ConfirmDialog.module.css';

export default function ConfirmDialog({
  open,
  title,
  message,
  cancelLabel = 'No',
  confirmLabel = 'Yes',
  loadingLabel = 'Working...',
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className={styles.overlay} role="presentation">
      <button type="button" className={styles.backdrop} onClick={loading ? undefined : onCancel} aria-label={cancelLabel} />
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <button type="button" className={styles.closeButton} onClick={onCancel} disabled={loading} aria-label={cancelLabel}>
          <X size={17} />
        </button>
        <div className={styles.iconWrap}><AlertTriangle size={22} /></div>
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{message}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onCancel} disabled={loading}>{cancelLabel}</button>
          <button type="button" className={styles.confirmButton} onClick={onConfirm} disabled={loading}>
            {loading ? <><Loader size={15} className={styles.spinner} /> {loadingLabel}</> : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Add styles**

```css
.overlay { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; padding: 20px; }
.backdrop { position: absolute; inset: 0; border: 0; background: rgba(15, 23, 42, 0.58); backdrop-filter: blur(12px); cursor: default; }
.dialog { position: relative; width: min(420px, 100%); padding: 24px; border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 24px; background: rgba(255, 255, 255, 0.96); box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28); color: #0f172a; }
.closeButton { position: absolute; top: 14px; right: 14px; width: 34px; height: 34px; border: 0; border-radius: 999px; display: grid; place-items: center; background: rgba(15, 23, 42, 0.06); color: #475569; cursor: pointer; }
.closeButton:disabled { opacity: 0.55; cursor: not-allowed; }
.iconWrap { width: 48px; height: 48px; border-radius: 16px; display: grid; place-items: center; background: #fee2e2; color: #dc2626; margin-bottom: 16px; }
.dialog h2 { margin: 0 32px 8px 0; font-size: 1.15rem; line-height: 1.3; }
.dialog p { margin: 0; color: #64748b; line-height: 1.55; }
.actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
.cancelButton, .confirmButton { min-height: 42px; border-radius: 14px; padding: 0 16px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; }
.cancelButton { border: 1px solid #e2e8f0; background: #ffffff; color: #334155; }
.confirmButton { border: 1px solid #ef4444; background: linear-gradient(135deg, #ef4444, #dc2626); color: #ffffff; box-shadow: 0 12px 24px rgba(220, 38, 38, 0.24); }
.cancelButton:disabled, .confirmButton:disabled { opacity: 0.7; cursor: not-allowed; }
.spinner { animation: spin 0.85s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
```

## Task 2: Add i18n Copy

**Files:**
- Modify: `src/lib/i18n/translations.js`

- [ ] **Step 1: Add translation keys under `common` and destructive sections**

```js
confirm: {
  no: 'No',
  yesDelete: 'Yes, delete',
  yesCancelPlan: 'Yes, cancel plan',
  deleting: 'Deleting...',
  cancelling: 'Cancelling...',
  deleteChatTitle: 'Delete this chat?',
  deleteChatMessage: 'This saved automation script will be permanently deleted.',
  deleteProjectTitle: 'Delete this project?',
  deleteProjectMessage: 'This project and all scripts inside it will be permanently deleted.',
  cancelPlanTitle: 'Cancel current plan?',
  cancelPlanMessage: 'Your paid plan will switch to Free immediately.',
}
```

Indonesian keys mirror English:

```js
confirm: {
  no: 'Tidak',
  yesDelete: 'Ya, hapus',
  yesCancelPlan: 'Ya, batalkan paket',
  deleting: 'Menghapus...',
  cancelling: 'Membatalkan...',
  deleteChatTitle: 'Hapus chat ini?',
  deleteChatMessage: 'Script automation tersimpan ini akan dihapus permanen.',
  deleteProjectTitle: 'Hapus project ini?',
  deleteProjectMessage: 'Project ini dan semua script di dalamnya akan dihapus permanen.',
  cancelPlanTitle: 'Batalkan paket aktif?',
  cancelPlanMessage: 'Paket berbayar kamu akan langsung berubah ke Free.',
}
```

## Task 3: Wire Project Delete

**Files:**
- Modify: `src/components/ProjectsPage.js`

- [ ] **Step 1: Replace `confirm()` with pending state and `ConfirmDialog`**

Use `pendingDeleteProjectId`, `deletingProject`, open dialog from trash click, and execute `DELETE /api/projects` from dialog confirm.

## Task 4: Wire Plan Cancel

**Files:**
- Modify: `src/components/PricingPage.js`

- [ ] **Step 1: Replace `confirm()` with pending state and `ConfirmDialog`**

Clicking active paid plan opens dialog. Confirm calls existing `POST /api/account/cancel-subscription` flow.

## Task 5: Wire Chat Deletes

**Files:**
- Modify: `src/app/(main)/page.js`

- [ ] **Step 1: Add pending delete script state and `ConfirmDialog`**

Recent chat and chats page delete buttons open dialog first. Confirm calls existing `DELETE /api/generated-scripts` flow.

## Task 6: Verify

**Files:**
- All modified files

- [ ] **Step 1: Check browser popup usage**

Run: `rg "\b(confirm|alert|prompt)\s*\(" src`
Expected: no matches.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit and push**

Run: `git add -A; git commit -m "feat: replace browser confirms with custom dialog"; git push`
Expected: commit and push succeed.
