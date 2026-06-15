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
