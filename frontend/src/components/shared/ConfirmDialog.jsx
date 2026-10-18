import { useEffect } from 'react';
import './offline.css';

export default function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  extraLabel,
  onConfirm,
  onCancel,
  onExtra,
  busy = false,
}) {
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div className="dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="dialog-title" className="dialog__title">
          {title}
        </h2>
        <div className="dialog__body">{children}</div>
        <div className="dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          {extraLabel && (
            <button type="button" className="btn btn--ghost" onClick={onExtra} disabled={busy}>
              {extraLabel}
            </button>
          )}
          <button type="button" className="btn btn--primary" onClick={onConfirm} disabled={busy}>
            {busy ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
