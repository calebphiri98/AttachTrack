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
  const [recipientRole, setRecipientRole] = useState('university_supervisor');

  const [requirementFiles, setRequirementFiles] = useState({});
  const [fulfillingId, setFulfillingId] = useState(null);
  const [requirementError, setRequirementError] = useState('');

  const fileInputRef = useRef(null);

  function load() {
    submissionsApi
      .listMine()
      .then((res) => setSubmissions(res.data))
      .catch((err) => setError(err.message));
  }

  function loadQueued() {
    getQueuedSubmissions()
      .then((items) =>
        setQueued(items.filter((i) => i.status === 'pending_sync' || i.status === 'failed'))
      )
      .catch(() => {});
  }

  useEffect(() => {
    load();
    loadQueued();

    function handleSynced() {
      load();
      loadQueued();
    }

    window.addEventListener('attachtrack:submissions-synced', handleSynced);

    return () => {
      window.removeEventListener('attachtrack:submissions-synced', handleSynced);
    };
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
      await submissionsApi.submitDocument(file, clientUuid, recipientRole);
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
          recipientRole,
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

  async function handleRequirementSubmit(requirementId) {
    const file = requirementFiles[requirementId];

    if (!file) {
      setRequirementError('Choose a file for the required submission.');
      return;
    }

    setRequirementError('');
    setFulfillingId(requirementId);

    try {
      await submissionsApi.fulfillRequirement(requirementId, file);

      setRequirementFiles((current) => {
        const updated = { ...current };
        delete updated[requirementId];
        return updated;
      });

      load();
    } catch (err) {
      setRequirementError(err.message || 'Unable to submit the required file.');
    } finally {
      setFulfillingId(null);
    }
  }

  const hasAnything =
    (submissions && submissions.length > 0) || queued.length > 0;

  const requirements =
    submissions?.filter((submission) => submission.due_date) || [];

  const normalSubmissions =
    submissions?.filter((submission) => !submission.due_date) || [];

  const isVideoSubmission = (fileType) =>
    (fileType || '').startsWith('video/');

  const recipientLabel = (role) =>
    role === 'industry_supervisor'
      ? 'Industry supervisor'
      : 'University supervisor';

  const formatDate = (date) => {
    if (!date) return '—';

    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const stateLabel = (state) => {
    if (state === 'submitted') return 'SUBMITTED';
    if (state === 'reopened') return 'REOPENED';
    if (state === 'closed') return 'MISSED';
    return 'OPEN';
  };

  return (
    <Card>
      <h2 className="section-title">Submissions</h2>

      {requirements.length > 0 && (
        <>
          <h3 style={{ marginTop: 0 }}>Submission Requirements</h3>

          {requirementError && (
            <p style={{ color: 'var(--error)' }}>{requirementError}</p>
          )}

          <ul className="record-list">
            {requirements.map((requirement) => {
              const canFulfill =
                requirement.state === 'open' ||
                requirement.state === 'reopened';

              return (
                <li
                  key={requirement.id}
                  className="record-list__row"
                  style={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <div style={{ width: '100%' }}>
                    <strong>
                      {recipientLabel(requirement.recipient_role)} requirement
                    </strong>

                    <div className="record-list__date">
                      Due: {formatDate(requirement.due_date)}
                    </div>

                    <div className="record-list__date">
                      Status: {stateLabel(requirement.state)}
                    </div>

                    {requirement.penalty_percent !== null &&
                      requirement.penalty_percent !== undefined && (
                        <div className="record-list__date">
                          Penalty: {requirement.penalty_percent}%
                        </div>
                      )}
                  </div>

                  {requirement.state === 'submitted' && (
                    <div style={{ color: 'var(--stamp)' }}>
                      Required submission completed.
                    </div>
                  )}

                  {canFulfill && (
                    <div style={{ width: '100%' }}>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.mp4,.mov,.webm"
                        onChange={(e) =>
                          setRequirementFiles((current) => ({
                            ...current,
                            [requirement.id]: e.target.files?.[0] || null,
                          }))
                        }
                      />

                      <div style={{ marginTop: 8 }}>
                        <StampButton
                          type="button"
                          loading={fulfillingId === requirement.id}
                          onClick={() =>
                            handleRequirementSubmit(requirement.id)
                          }
                          style={{
                            width: 'auto',
                            padding: '9px 20px',
                          }}
                        >
                          Submit Required File
                        </StampButton>
                      </div>
                    </div>
                  )}

                  {requirement.state === 'closed' && (
                    <p style={{ color: 'var(--error)', margin: 0 }}>
                      This requirement was missed. Ask your supervisor to
                      reopen it before submitting.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="section-divider" />
        </>
      )}

      <h3>Normal Submissions</h3>

      {canSubmit ? (
        <form onSubmit={handleUpload} className="inline-form">
          <label className="inline-form__field inline-form__field--full">
            <span>Send to</span>

            <select
              value={recipientRole}
              onChange={(e) => setRecipientRole(e.target.value)}
            >
              <option value="university_supervisor">
                University supervisor
              </option>
              <option value="industry_supervisor">
                Industry supervisor
              </option>
            </select>
          </label>

          <label className="inline-form__field inline-form__field--full">
            <span>
              Document or video (PDF, Word, MP4, MOV — up to 150MB)
            </span>

            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.doc,.docx,.mp4,.mov,.webm"
            />
          </label>

          {error && (
            <p className="inline-form__error">{error}</p>
          )}

          <StampButton
            type="submit"
            loading={uploading}
            style={{
              width: 'auto',
              padding: '9px 20px',
            }}
          >
            Submit file
          </StampButton>
        </form>
      ) : (
        <p style={{ color: 'var(--muted)' }}>
          You'll be able to submit documents once you're linked to a
          supervisor.
        </p>
      )}

      <div className="section-divider" />

      {submissions === null && !error && (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      )}

      {submissions && !hasAnything && (
        <EmptyState>No submissions yet.</EmptyState>
      )}

      {normalSubmissions.length > 0 && (
        <ul className="record-list">
          {queued.map((q) =>
            q.status === 'failed' ? (
              <li
                key={q.clientUuid}
                className="record-list__row"
                style={{
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                  }}
                >
                  <span style={{ color: 'var(--muted)' }}>
                    {q.fileName}
                  </span>

                  <span
                    className="record-list__date"
                    style={{ color: 'var(--error)' }}
                  >
                    Sync failed
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      color: 'var(--error)',
                      fontSize: '0.82rem',
                    }}
                  >
                    {q.errorMessage ||
                      'This submission could not be sent.'}
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
                    {retryingId === q.clientUuid
                      ? 'Retrying…'
                      : 'Retry'}
                  </button>
                </div>
              </li>
            ) : (
              <li
                key={q.clientUuid}
                className="record-list__row"
              >
                <span style={{ color: 'var(--muted)' }}>
                  {q.fileName} · {recipientLabel(q.recipientRole)}
                </span>

                <span
                  className="record-list__date"
                  style={{ color: 'var(--stamp)' }}
                >
                  Pending sync —{' '}
                  {new Date(q.submittedAt).toLocaleDateString()}
                </span>
              </li>
            )
          )}

          {normalSubmissions.map((s) => (
            <li
              key={s.id}
              className="record-list__row"
              style={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              {isVideoSubmission(s.file_type) ? (
                <video
                  controls
                  src={s.file_url}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 220,
                    borderRadius: 8,
                  }}
                />
              ) : (
                <a
                  href={s.file_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--stamp)' }}
                >
                  {s.file_name}
                </a>
              )}

              <span className="record-list__date">
                {s.file_name} · {recipientLabel(s.recipient_role)}
                {isVideoSubmission(s.file_type) ? ' • video' : ''}
                {' • '}
                {formatDate(s.submitted_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
