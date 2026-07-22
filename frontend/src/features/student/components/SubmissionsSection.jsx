import { useEffect, useState, useRef } from 'react';
import { Card, EmptyState } from '../../../components/shared/Card';
import StampButton from '../../../components/shared/StampButton';
import * as submissionsApi from '../../../api/submissions.api';
import { enqueueSubmission, getQueuedSubmissions } from '../../../offline/db';
import { trySyncQueuedSubmissions } from '../../../offline/syncSubmissions';

export default function SubmissionsSection({ canSubmit }) {
  const [submissions, setSubmissions] = useState(null);
  const [queued, setQueued] = useState([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [retryingId, setRetryingId] = useState(null);
  const fileInputRef = useRef(null);

  function load() {
    submissionsApi
      .listMine()
      .then((res) => setSubmissions(res.data))
      .catch((err) => setError(err.message));
  }

  function loadQueued() {
    getQueuedSubmissions()
      .then((items) => setQueued(items.filter((i) => i.status === 'pending_sync' || i.status === 'failed')))
      .catch(() => {
        // no queue yet — fine, nothing pending
      });
  }

  useEffect(() => {
    load();
    loadQueued();

    // SyncManager (mounted once, app-wide) runs in the background and
    // dispatches this after every sync attempt — refresh both lists so a
    // just-synced item moves out of "Pending sync" and into the real list
    // without needing a manual page reload.
    function handleSynced() {
      load();
      loadQueued();
    }
    window.addEventListener('attachtrack:submissions-synced', handleSynced);
    return () => window.removeEventListener('attachtrack:submissions-synced', handleSynced);
  }, []);

  async function handleUpload(e) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Choose a file first');
      return;
    }
    setError('');
    setUploading(true);

    const clientUuid = crypto.randomUUID();
    const submittedAt = new Date().toISOString();

    try {
      await submissionsApi.submitDocument(file, clientUuid);
      fileInputRef.current.value = '';
      load();
    } catch (err) {
      if (err.statusCode) {
        setError(err.message);
      } else {
        await enqueueSubmission({
          clientUuid,
          file,
          fileName: file.name,
          fileType: file.type,
          submittedAt,
          status: 'pending_sync',
        });
        fileInputRef.current.value = '';
        loadQueued();
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleRetry(clientUuid) {
    setRetryingId(clientUuid);
    try {
      await trySyncQueuedSubmissions();
    } finally {
      setRetryingId(null);
    }
  }

  const hasAnything = (submissions && submissions.length > 0) || queued.length > 0;

  return (
    <Card>
      <h2 className="section-title">Submissions</h2>

      {canSubmit ? (
        <form onSubmit={handleUpload} className="inline-form">
          <label className="inline-form__field inline-form__field--full">
            <span>Document (PDF or Word, up to 20MB)</span>
            <input type="file" ref={fileInputRef} accept=".pdf,.doc,.docx" />
          </label>
          {error && <p className="inline-form__error">{error}</p>}
          <StampButton type="submit" loading={uploading} style={{ width: 'auto', padding: '9px 20px' }}>
            Submit document
          </StampButton>
        </form>
      ) : (
        <p style={{ color: 'var(--muted)' }}>
          You'll be able to submit documents once you're linked to a supervisor.
        </p>
      )}

      <div className="section-divider" />

      {submissions === null && !error && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
      {submissions && !hasAnything && <EmptyState>No submissions yet.</EmptyState>}

      {hasAnything && (
        <ul className="record-list">
          {queued.map((q) =>
            q.status === 'failed' ? (
              <li
                key={q.clientUuid}
                className="record-list__row"
                style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ color: 'var(--muted)' }}>{q.fileName}</span>
                  <span className="record-list__date" style={{ color: 'var(--error)' }}>
                    Sync failed
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span style={{ color: 'var(--error)', fontSize: '0.82rem' }}>
                    {q.errorMessage || 'This submission could not be sent.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRetry(q.clientUuid)}
                    disabled={retryingId === q.clientUuid}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: 'var(--stamp)',
                      cursor: 'pointer',
                      font: 'inherit',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      padding: 0,
                    }}
                  >
                    {retryingId === q.clientUuid ? 'Retrying…' : 'Retry'}
                  </button>
                </div>
              </li>
            ) : (
              <li key={q.clientUuid} className="record-list__row">
                <span style={{ color: 'var(--muted)' }}>{q.fileName}</span>
                <span className="record-list__date" style={{ color: 'var(--stamp)' }}>
                  Pending sync — {new Date(q.submittedAt).toLocaleDateString()}
                </span>
              </li>
            )
          )}
          {submissions &&
            submissions.map((s) => (
              <li key={s.id} className="record-list__row">
                <a href={s.file_url} target="_blank" rel="noreferrer" style={{ color: 'var(--stamp)' }}>
                  {s.file_name}
                </a>
                <span className="record-list__date">
                  {new Date(s.submitted_at).toLocaleDateString()}
                </span>
              </li>
            ))}
        </ul>
      )}
    </Card>
  );
}