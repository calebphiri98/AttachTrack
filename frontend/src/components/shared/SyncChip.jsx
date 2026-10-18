import { useState } from 'react';
import { retryNow } from '../../offline/syncEngine';
import './offline.css';

const LABELS = {
  pending: 'Pending',
  syncing: 'Syncing',
  synced: 'Synced',
  failed: 'Failed',
};

export default function SyncChip({ sync, showError = true }) {
  const [retrying, setRetrying] = useState(false);

  if (!sync) return null;

  async function handleRetry() {
    setRetrying(true);
    try {
      await retryNow(sync.recordId);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <span className="sync-chip">
      <span className={`sync-chip__badge sync-chip__badge--${sync.status}`}>
        {LABELS[sync.status] || sync.status}
      </span>
      {sync.status === 'failed' && sync.retryable && (
        <button type="button" className="sync-chip__retry" onClick={handleRetry} disabled={retrying}>
          {retrying ? 'Retrying...' : 'Retry'}
        </button>
      )}
      {sync.status === 'failed' && showError && sync.error && (
        <p className="sync-chip__error">{sync.error}</p>
      )}
    </span>
  );
}
