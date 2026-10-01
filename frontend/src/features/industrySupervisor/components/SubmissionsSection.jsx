import { useEffect, useState } from 'react';
import * as submissionsApi from '../../../api/submissions.api';
import styles from './SubmissionsSection.module.css';

function ActionButton({ loading, children, ...props }) {
  return (
    <button className={styles.button} disabled={loading} {...props}>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {children}
    </button>
  );
}

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
      await submissionsApi.createRequirement(studentId, new Date(dueDate).toISOString());
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
      const penalty = penalties[submissionId] === '' ? undefined : penalties[submissionId];
      await submissionsApi.reopenRequirement(submissionId, penalty);
      loadSubmissions();
    } catch (err) {
      setError(err.message);
    } finally {
      setReopeningId(null);
    }
  }

  const requirements = submissions?.filter((s) => s.due_date) || [];
  const normalSubmissions = submissions?.filter((s) => !s.due_date) || [];

  const getRequirementStatus = (submission) => {
    if (submission.state === 'submitted') return 'SUBMITTED';
    if (submission.state === 'reopened') return 'REOPENED';
    if (submission.state === 'closed') return 'MISSED';
    return 'OPEN';
  };

  const badgeClass = (state) => {
    if (state === 'submitted') return styles.badgeSubmitted;
    if (state === 'reopened') return styles.badgeReopened;
    if (state === 'closed') return styles.badgeMissed;
    return styles.badgeOpen;
  };

  return (
    <section className={styles.card}>
      <h2 className={styles.sectionTitle}>Submission Requirements</h2>

      <form onSubmit={handleCreateRequirement} className={styles.createForm} noValidate>
        <label className={`${styles.field} ${styles.fieldGrow}`}>
          <span className={styles.label}>Due date and time</span>
          <input
            className={styles.input}
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>

        <ActionButton type="submit" loading={creating}>
          Create requirement
        </ActionButton>
      </form>

      {error && <p className={styles.error}>{error}</p>}

      <hr className={styles.divider} />

      <h3 className={styles.subTitle}>Required submissions</h3>

      {submissions === null && !error && <p className={styles.loading}>Loading...</p>}

      {submissions && requirements.length === 0 && (
        <p className={styles.empty}>No submission requirements yet.</p>
      )}

      {requirements.length > 0 && (
        <ul className={styles.list}>
          {requirements.map((s) => (
            <li key={s.id} className={styles.item}>
              <div className={styles.itemHead}>
                <strong className={styles.itemTitle}>Industry supervisor requirement</strong>
                <span className={`${styles.badge} ${badgeClass(s.state)}`}>
                  {getRequirementStatus(s)}
                </span>
              </div>

              <span className={styles.meta}>Due: {new Date(s.due_date).toLocaleString()}</span>

              {s.file_url && (
                <a className={styles.fileLink} href={s.file_url} target="_blank" rel="noreferrer">
                  {s.file_name || 'View submitted file'}
                </a>
              )}

              {s.penalty_percent !== null && s.penalty_percent !== undefined && (
                <span className={styles.penalty}>Late penalty: {s.penalty_percent}%</span>
              )}

              {(s.state === 'closed' || s.state === 'reopened') && !s.file_url && (
                <div className={styles.reopenRow}>
                  <label className={`${styles.field} ${styles.fieldPenalty}`}>
                    <span className={styles.label}>Penalty %</span>
                    <input
                      className={styles.input}
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

                  <ActionButton
                    type="button"
                    loading={reopeningId === s.id}
                    onClick={() => handleReopen(s.id)}
                  >
                    {s.state === 'reopened' ? 'Update reopening' : 'Reopen submission'}
                  </ActionButton>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <hr className={styles.divider} />

      <h2 className={styles.sectionTitle}>Submitted Documents</h2>

      {submissions && normalSubmissions.length === 0 && (
        <p className={styles.empty}>No documents submitted yet.</p>
      )}

      {normalSubmissions.length > 0 && (
        <ul className={styles.list}>
          {normalSubmissions.map((s) => (
            <li key={s.id} className={styles.item}>
              {isVideoSubmission(s.file_type) ? (
                <video className={styles.video} controls src={s.file_url} />
              ) : (
                <a className={styles.fileLink} href={s.file_url} target="_blank" rel="noreferrer">
                  {s.file_name}
                </a>
              )}

              <span className={styles.meta}>
                {s.file_name}
                {isVideoSubmission(s.file_type) ? ' (video)' : ''}
                {' | '}
                {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : 'Not submitted'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}