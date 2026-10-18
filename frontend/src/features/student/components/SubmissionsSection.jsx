import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, EmptyState } from '../../../components/shared/Card';
import StampButton from '../../../components/shared/StampButton';
import SyncChip from '../../../components/shared/SyncChip';
import * as submissionsApi from '../../../api/submissions.api';
import * as actions from '../../../offline/actions';
import { useOutbox, useSyncRefresh } from '../../../offline/hooks';
import { pendingFulfillments, pendingSubmissions, syncInfo } from '../../../offline/overlays';
import { describeSize, validateFiles } from '../../../offline/images';
import { discardRecord } from '../../../offline/syncEngine';

const MAX_BYTES = 150 * 1024 * 1024;
const QUEUED_TEXT = 'Saved on this device. It will upload automatically when the connection allows.';

function recipientLabel(role) {
  return role === 'industry_supervisor' ? 'Industry supervisor' : 'University supervisor';
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function stateLabel(state) {
  if (state === 'submitted') return 'SUBMITTED';
  if (state === 'reopened') return 'REOPENED';
  if (state === 'closed') return 'MISSED';
  return 'OPEN';
}

function isVideo(fileType) {
  return (fileType || '').startsWith('video/');
}

export default function SubmissionsSection({ canSubmit }) {
  const [submissions, setSubmissions] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recipientRole, setRecipientRole] = useState('university_supervisor');
  const [requirementFiles, setRequirementFiles] = useState({});
  const [fulfillingId, setFulfillingId] = useState(null);
  const [requirementError, setRequirementError] = useState('');
  const fileInputRef = useRef(null);
  const records = useOutbox();

  const queued = useMemo(() => pendingSubmissions(records), [records]);
  const fulfilments = useMemo(() => pendingFulfillments(records), [records]);

  function load() {
    submissionsApi
      .listMine()
      .then((res) => setSubmissions(res.data))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []);

  useSyncRefresh(load);

  async function handleUpload(e) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      setError('Choose a file first');
      return;
    }
    const problem = validateFiles([file], { maxFiles: 1, maxBytes: MAX_BYTES });
    if (problem) {
      setError(problem);
      return;
    }

    setError('');
    setNotice('');
    setUploading(true);

    try {
      const result = await actions.submitDocument({ file, recipientRole });
      fileInputRef.current.value = '';
      setNotice(result.queued ? QUEUED_TEXT : 'Submitted.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleRequirementSubmit(requirementId) {
    const file = requirementFiles[requirementId];

    if (!file) {
      setRequirementError('Choose a file for the required submission.');
      return;
    }
    const problem = validateFiles([file], { maxFiles: 1, maxBytes: MAX_BYTES });
    if (problem) {
      setRequirementError(problem);
      return;
    }

    setRequirementError('');
    setNotice('');
    setFulfillingId(requirementId);

    try {
      const result = await actions.fulfillRequirement({ submissionId: requirementId, file });
      setRequirementFiles((current) => {
        const updated = { ...current };
        delete updated[requirementId];
        return updated;
      });
      if (result.queued) setNotice(QUEUED_TEXT);
      load();
    } catch (err) {
      setRequirementError(err.message || 'Unable to submit the required file.');
    } finally {
      setFulfillingId(null);
    }
  }

  const requirements = submissions?.filter((submission) => submission.due_date) || [];
  const normalSubmissions = submissions?.filter((submission) => !submission.due_date) || [];
  const hasAnything = (submissions && submissions.length > 0) || queued.length > 0;

  return (
    <Card>
      <h2 className="section-title">Submissions</h2>

      {notice && <p className="pending-note">{notice}</p>}

      {requirements.length > 0 && (
        <>
          <h3 style={{ marginTop: 0 }}>Submission Requirements</h3>

          {requirementError && <p style={{ color: 'var(--error)' }}>{requirementError}</p>}

          <ul className="record-list">
            {requirements.map((requirement) => {
              const waiting = fulfilments.get(requirement.id);
              const canFulfill =
                !waiting && (requirement.state === 'open' || requirement.state === 'reopened');

              return (
                <li
                  key={requirement.id}
                  className="record-list__row"
                  style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}
                >
                  <div style={{ width: '100%' }}>
                    <strong>{recipientLabel(requirement.recipient_role)} requirement</strong>
                    <div className="record-list__date">Due: {formatDate(requirement.due_date)}</div>
                    <div className="record-list__date">
                      Status: {waiting ? 'SUBMITTED (waiting to sync)' : stateLabel(requirement.state)}
                    </div>
                    {requirement.penalty_percent !== null &&
                      requirement.penalty_percent !== undefined && (
                        <div className="record-list__date">Penalty: {requirement.penalty_percent}%</div>
                      )}
                  </div>

                  {waiting && (
                    <div style={{ width: '100%' }}>
                      <div className="record-list__date">{waiting.label}</div>
                      <SyncChip sync={syncInfo(waiting)} />
                      {waiting.status === 'failed' && (
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => discardRecord(waiting.id)}
                        >
                          Discard
                        </button>
                      )}
                    </div>
                  )}

                  {requirement.state === 'submitted' && (
                    <div style={{ color: 'var(--stamp)' }}>Required submission completed.</div>
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
                          onClick={() => handleRequirementSubmit(requirement.id)}
                          style={{ width: 'auto', padding: '9px 20px' }}
                        >
                          Submit Required File
                        </StampButton>
                      </div>
                      <p className="pending-note">
                        If you are offline, the time you submit is recorded now and the server checks
                        it against the deadline when it syncs.
                      </p>
                    </div>
                  )}

                  {requirement.state === 'closed' && !waiting && (
                    <p style={{ color: 'var(--error)', margin: 0 }}>
                      This requirement was missed. Ask your supervisor to reopen it before submitting.
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
            <select value={recipientRole} onChange={(e) => setRecipientRole(e.target.value)}>
              <option value="university_supervisor">University supervisor</option>
              <option value="industry_supervisor">Industry supervisor</option>
            </select>
          </label>

          <label className="inline-form__field inline-form__field--full">
            <span>Document or video (PDF, Word, MP4, MOV, up to 150MB)</span>
            <input type="file" ref={fileInputRef} accept=".pdf,.doc,.docx,.mp4,.mov,.webm" />
          </label>

          {error && <p className="inline-form__error">{error}</p>}

          <StampButton type="submit" loading={uploading} style={{ width: 'auto', padding: '9px 20px' }}>
            Submit file
          </StampButton>
        </form>
      ) : (
        <p style={{ color: 'var(--muted)' }}>
          You will be able to submit documents once you are linked to a supervisor.
        </p>
      )}

      <div className="section-divider" />

      {submissions === null && !error && <p style={{ color: 'var(--muted)' }}>Loading...</p>}

      {submissions && !hasAnything && <EmptyState>No submissions yet.</EmptyState>}

      {(queued.length > 0 || normalSubmissions.length > 0) && (
        <ul className="record-list">
          {queued.map((record) => (
            <li
              key={record.id}
              className="record-list__row"
              style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}
            >
              <span style={{ color: 'var(--muted)' }}>
                {record.label} - {recipientLabel(record.payload.recipientRole)}
                {record.files[0] ? ` (${describeSize(record.files[0].size)})` : ''}
              </span>
              <span className="record-list__date">
                Recorded {new Date(record.clientCreatedAt).toLocaleString()}
              </span>
              <SyncChip sync={syncInfo(record)} />
              {record.status === 'failed' && (
                <button type="button" className="btn btn--ghost" onClick={() => discardRecord(record.id)}>
                  Discard
                </button>
              )}
            </li>
          ))}

          {normalSubmissions.map((s) => (
            <li
              key={s.id}
              className="record-list__row"
              style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}
            >
              {isVideo(s.file_type) ? (
                <video
                  controls
                  src={s.file_url}
                  style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8 }}
                />
              ) : (
                <a href={s.file_url} target="_blank" rel="noreferrer" style={{ color: 'var(--stamp)' }}>
                  {s.file_name}
                </a>
              )}
              <span className="record-list__date">
                {s.file_name} - {recipientLabel(s.recipient_role)}
                {isVideo(s.file_type) ? ' - video' : ''}
                {' - '}
                {formatDate(s.submitted_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
