'use client';

import { useEffect, useRef } from 'react';
import { WarningIcon } from './AdminIcons';
import styles from './Admin.module.css';

export default function ConfirmDialog({ open, title, children, confirmLabel, busy, onConfirm, onCancel }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.confirmDialog}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onClose={() => {
        if (open && !busy) onCancel();
      }}
    >
      <div className={styles.dialogIcon}><WarningIcon /></div>
      <h2>{title}</h2>
      <div className={styles.dialogBody}>{children}</div>
      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel} disabled={busy}>取消</button>
        <button type="button" className={styles.dangerButton} onClick={onConfirm} disabled={busy}>
          {busy ? <span className={styles.spinnerSmall} aria-hidden="true" /> : null}
          {busy ? '處理中…' : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
