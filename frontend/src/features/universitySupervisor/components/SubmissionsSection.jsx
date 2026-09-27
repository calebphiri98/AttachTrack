import { useEffect, useState } from 'react';
import { Card, EmptyState } from '../../../components/shared/Card';
import StampButton from '../../../components/shared/StampButton';
import * as submissionsApi from '../../../api/submissions.api';

export default function SubmissionsSection({ studentId }) {
  const [submissions, setSubmissions] = useState(null);
  const [error, setError] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [reopeningId, setReopeningId] = useState(null);
  const [penalties, setPenalties] = useState({});

  const isVideoSubmission = (fileType) => (fileType || '').startsWith('video/');

  function loadSubmissions() {
    setError('');

    submissionsApi
      .listSubmissionsForStudent(studentId)
      .then((res) => setSubmissions(res.data))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadSubmissions();
  }, [studentId]);

  async function handleCreateRequirement(e) {
    e.preventDefault();

    if (!dueDate) {
      setError('Choose a due date and time.');
      return;
    }

    setCreating(true);
    setError('');

    try {
      await submissionsApi.createRequirement(
        studentId,
        new Date(dueDate).toISOString()
      );

      setDueDate('');
      loadSubmissions();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleReopen(submissionId) {
    setReopeningId(submissionId);
    setError('');

    try {
      const penalty = penalties[submissionId] === ''
        ? undefined
        : penalties[submissionId];

      await submissionsApi.reopenRequirement(submissionId, penalty);
      loadSubmissions();
    } catch (err) {
      setError(err.message);
    } finally {
      setReopeningId(null);
    }
  }

  const requirements =
    submissions?.filter((s) => s.due_date) || [];

  const normalSubmissions =
    submissions?.filter((s) => !s.due_date) || [];

  const getRequirementStatus = (submission) => {
    if (submission.state === 'submitted') return 'SUBMITTED';
    if (submission.state === 'reopened') return 'REOPENED';
    if (submission.state === 'closed') return 'MISSED';
    return 'OPEN';
  };

  const statusStyle = (state) => {
    if (state === 'submitted') {
      return { color: 'var(--stamp)', fontWeight: 700 };
    }

    if (state === 'closed') {
      return { color: 'var(--error)', fontWeight: 700 };
    }

    if (state === 'reopened') {
      return { color: 'var(--stamp)', fontWeight: 700 };
    }

    return { color: 'var(--muted)', fontWeight: 700 };
  };

  return (
    <Card>
      <h2 className="section-title">Submission Requirements</h2>

      <form onSubmit={handleCreateRequirement} className="inline-form">
        <label className="inline-form__field inline-form__field--full">
          <span>Due date and time</span>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>

        <StampButton
          type="submit"
          loading={creating}
          style={{ width: 'auto', padding: '9px 20px' }}
        >
          Create requirement
        </StampButton>
      </form>

      {error && (
        <p style={{ color: 'var(--error)', marginTop: 10 }}>
          {error}
        </p>
      )}

      <div className="section-divider" />

      <h3 style={{ marginBottom: 12 }}>Required submissions</h3>

      {submissions === null && !error && (
        <p style={{ color: 'var(--muted)' }}>Loading...</p>
      )}

      {submissions && requirements.length === 0 && (
        <EmptyState>No submission requirements yet.</EmptyState>
      )}

      {requirements.length > 0 && (
        <ul className="record-list">
          {requirements.map((s) => (
            <li
              key={s.id}
              className="record-list__row"
              style={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <strong>
                University supervisor requirement
              </strong>

              <span className="record-list__date">
                Due:{' '}
                {new Date(s.due_date).toLocaleString()}
              </span>

              <span style={statusStyle(s.state)}>
                Status: {getRequirementStatus(s)}
              </span>

              {s.file_url && (
                <a
                  href={s.file_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--stamp)' }}
                >
                  {s.file_name || 'View submitted file'}
                </a>
              )}

              {s.penalty_percent !== null &&
                s.penalty_percent !== undefined && (
                  <span className="record-list__date">
                    Late penalty: {s.penalty_percent}%
                  </span>
                )}

              {(s.state === 'closed' || s.state === 'reopened') &&
                !s.file_url && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      width: '100%',
                    }}
                  >
                    <label
                      className="inline-form__field"
                      style={{ maxWidth: 180 }}
                    >
                      <span>Penalty %</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={penalties[s.id] ?? ''}
                        onChange={(e) =>
                          setPenalties((current) => ({
                            ...current,
                            [s.id]: e.target.value,
                          }))
                        }
                        placeholder="0"
                      />
                    </label>

                    <StampButton
                      type="button"
                      loading={reopeningId === s.id}
                      onClick={() => handleReopen(s.id)}
                      style={{
                        width: 'auto',
                        padding: '9px 20px',
                      }}
                    >
                      {s.state === 'reopened'
                        ? 'Update reopening'
                        : 'Reopen submission'}
                    </StampButton>
                  </div>
                )}
            </li>
          ))}
        </ul>
      )}

      <div className="section-divider" />

      <h2 className="section-title">Submitted Documents</h2>

      {submissions && normalSubmissions.length === 0 && (
        <EmptyState>No documents submitted yet.</EmptyState>
      )}

      {normalSubmissions.length > 0 && (
        <ul className="record-list">
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
                {s.file_name}
                {isVideoSubmission(s.file_type)
                  ? ' • video'
                  : ''}
                {' • '}
                {s.submitted_at
                  ? new Date(s.submitted_at).toLocaleDateString()
                  : 'Not submitted'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
