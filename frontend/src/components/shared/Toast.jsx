import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onNetworkRestored } from '../../offline/network';
import { onSyncFinished } from '../../offline/syncEngine';
import './offline.css';

const ToastContext = createContext({ push: () => {} });
const DISMISS_MS = 5000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (message, kind = 'info') => {
      counter.current += 1;
      const id = counter.current;
      setToasts((list) => [...list.slice(-3), { id, message, kind }]);
      setTimeout(() => dismiss(id), DISMISS_MS);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.kind}`} role="status">
            <span className="toast__text">{toast.message}</span>
            <button
              type="button"
              className="toast__close"
              aria-label="Dismiss"
              onClick={() => dismiss(toast.id)}
            >
              x
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export function SyncToasts() {
  const { push } = useToast();

  useEffect(() => {
    const stopSync = onSyncFinished((event) => {
      const { synced = 0, failed = 0, foreground } = event.detail || {};
      if (foreground) return;
      if (synced > 0) {
        push(`${synced} ${synced === 1 ? 'change' : 'changes'} synced.`, 'success');
      }
      if (failed > 0) {
        push(
          `${failed} ${failed === 1 ? 'item was' : 'items were'} rejected. Open Sync Center to review.`,
          'error'
        );
      }
    });
    const stopNetwork = onNetworkRestored(() => push('Back online.', 'success'));
    return () => {
      stopSync();
      stopNetwork();
    };
  }, [push]);

  return null;
}
