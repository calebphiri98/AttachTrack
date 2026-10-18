import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../../components/shared/PortalLayout';
import SyncChip from '../../../components/shared/SyncChip';
import { Card, EmptyState } from '../../../components/shared/Card';
import { useNetworkStatus, useOutbox, useSyncSnapshot } from '../../../offline/hooks';
import {
  discardRecord,
  retryAllNow,
  retryNow,
  triggerSync,
} from '../../../offline/syncEngine';
import { clearSynced } from '../../../offline/outbox';
import { describeSize } from '../../../offline/images';
import { checkConnection } from '../../../offline/network';
import { getStorageStatus, requestPersistentStorage } from '../../../offline/persist';
import { useAuth } from '../../../context/AuthContext';
import '../../../components/shared/offline.css';

const TYPE_LABELS = {
  'logbook.create': 'Logbook entry',
  'logbook.update': 'Logbook edit',
  'logbook.submit': 'Logbook submission',
  'logbook.submitWeek': 'Logbook week submission',
  'logbook.delete': 'Logbook deletion',
  'submission.create': 'Document submission',
  'submission.fulfill': 'Required submission',
  'attendance.mark': 'Attendance',
  'assessment.save': 'Assessment',
  'siteVisit.create': 'Site visit',
  'message.send': 'Message',
};

const GROUPS = [
  { id: 'failed', title: 'Needs attention' },
  { id: 'active', title: 'Waiting to sync' },
  { id: 'synced', title: 'Recently synced' },
];

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupOf(record) {
  if (record.status === 'failed') return 'failed';
  if (record.status === 'synced') return 'synced';
  return 'active';
}

export default function SyncCenterPage() {
  const { user } = useAuth();
  const records = useOutbox();
  const network = useNetworkStatus();
  const sync = useSyncSnapshot();
  const [storage, setStorage] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 250);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    getStorageStatus().then(setStorage);
  }, []);

  const grouped = { failed: [], active: [], synced: [] };
  [...records].reverse().forEach((record) => grouped[groupOf(record)].push(record));

  async function handleSyncNow() {
    setBusy(true);
    try {
      if (network.status === 'offline') await checkConnection();
      await triggerSync('manual');
    } finally {
      setBusy(false);
    }
  }

  async function handleRetryAll() {
    setBusy(true);
    try {
      await retryAllNow();
    } finally {
      setBusy(false);
    }
  }

  async function handleDiscard(record) {
    const message =
      record.type.endsWith('.create')
        ? 'Discard this item and anything that depends on it? It has not reached the server and cannot be recovered.'
        : 'Discard this item? It has not reached the server and cannot be recovered.';
    if (!window.confirm(message)) return;
    await discardRecord(record.id);
  }

  async function handleProtect() {
    await requestPersistentStorage();
    setStorage(await getStorageStatus());
  }

  const connectionText =
    network.status === 'offline'
      ? 'Offline'
      : network.status === 'unstable'
        ? 'Unstable'
        : 'Online';

  return (
    <PortalLayout
      eyebrow="Offline and sync"
      title="Sync Center"
      actions={
        <button type="button" className="btn btn--primary" onClick={handleSyncNow} disabled={busy || sync.running}>
          {sync.running ? 'Syncing...' : 'Sync now'}
        </button>
      }
    >
      <div className="sync-center__grid">
        <div className="sync-center__summary">
          <div className="sync-center__stat">
            <span className="sync-center__meta">Connection</span>
            <strong>{connectionText}</strong>
          </div>
          <div className="sync-center__stat">
            <span className="sync-center__meta">Waiting</span>
            <strong>{grouped.active.length}</strong>
          </div>
          <div className="sync-center__stat">
            <span className="sync-center__meta">Needs attention</span>
            <strong>{grouped.failed.length}</strong>
          </div>
          <div className="sync-center__stat">
            <span className="sync-center__meta">Last synced</span>
            <strong style={{ fontSize: '1rem' }}>
              {sync.lastSyncedAt ? formatTime(sync.lastSyncedAt) : 'Not yet'}
            </strong>
          </div>
        </div>

        {storage && storage.persisted === false && (
          <Card>
            <h2 className="section-title">Protect your offline data</h2>
            <p className="pending-note">
              This browser may clear data stored on this device when space runs low, which could
              remove work that has not synced yet. Allow persistent storage to keep it safe.
            </p>
            <button type="button" className="btn btn--ghost" onClick={handleProtect}>
              Protect offline data
            </button>
          </Card>
        )}

        {!loaded && records.length === 0 && (
          <>
            <div className="sync-center__skeleton" />
            <div className="sync-center__skeleton" />
          </>
        )}

        {loaded && records.length === 0 && (
          <Card>
            <EmptyState>
              Nothing is waiting. Work you record while offline appears here until it reaches the
              server.
            </EmptyState>
          </Card>
        )}

        {GROUPS.map((group) => {
          const items = grouped[group.id];
          if (items.length === 0) return null;
          return (
            <Card key={group.id}>
              <div className="sync-center__item-head">
                <h2 className="section-title" style={{ margin: 0 }}>
                  {group.title} ({items.length})
                </h2>
                {group.id === 'failed' && items.some((item) => item.errorCode !== 'RECORD_LOCKED') && (
                  <button type="button" className="btn btn--ghost" onClick={handleRetryAll} disabled={busy}>
                    Retry all
                  </button>
                )}
                {group.id === 'synced' && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => clearSynced(user ? user.id : null)}
                  >
                    Clear list
                  </button>
                )}
              </div>

              <ul className="sync-center__list" style={{ marginTop: 12 }}>
                {items.map((record) => (
                  <li key={record.id} className="sync-center__item">
                    <div className="sync-center__item-head">
                      <span className="sync-center__label">
                        {TYPE_LABELS[record.type] || record.type}
                        {record.label ? `: ${record.label}` : ''}
                      </span>
                      <SyncChip
                        sync={{
                          status: record.status,
                          error: record.error,
                          retryable: record.errorCode !== 'RECORD_LOCKED',
                          recordId: record.id,
                        }}
                        showError={false}
                      />
                    </div>

                    <span className="sync-center__meta">
                      Recorded {formatTime(record.clientCreatedAt)}
                      {record.files && record.files.length > 0
                        ? ` - ${record.files.length} ${record.files.length === 1 ? 'file' : 'files'} (${describeSize(
                            record.files.reduce((sum, file) => sum + (file.size || 0), 0)
                          )})`
                        : ''}
                      {record.syncedAt ? ` - synced ${formatTime(record.syncedAt)}` : ''}
                    </span>

                    {record.status === 'failed' && record.error && (
                      <p className="sync-chip__error">
                        {record.errorCode === 'RECORD_LOCKED'
                          ? `The server rejected this change: ${record.error} Your copy is kept here.`
                          : record.error}
                      </p>
                    )}

                    {record.status !== 'synced' && (
                      <div className="sync-center__actions">
                        {record.status === 'failed' && record.errorCode !== 'RECORD_LOCKED' && (
                          <button
                            type="button"
                            className="btn btn--ghost"
                            onClick={() => retryNow(record.id)}
                          >
                            Retry
                          </button>
                        )}
                        {record.status !== 'syncing' && (
                          <button
                            type="button"
                            className="btn btn--ghost"
                            onClick={() => handleDiscard(record)}
                          >
                            Discard
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}

        <p className="pending-note">
          Your work is saved on this device first, then sent to the server automatically when the
          connection allows. <Link to="/settings/notifications">Notification settings</Link>
        </p>
      </div>
    </PortalLayout>
  );
}
