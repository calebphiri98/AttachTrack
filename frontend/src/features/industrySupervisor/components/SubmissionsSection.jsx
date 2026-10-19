import { useEffect, useState } from 'react';
import * as submissionsApi from '../../../api/submissions.api';
import SectionShell, { EmptyBlock, Pill } from './SectionShell';
import ui from '../styles/controls.module.css';
import styles from './SubmissionsSection.module.css';

function ActionButton({ loading, children, ...props }) {
  return (
    <button className="btn btn--primary" disabled={loading} {...props}>
      {loading && <span className={ui.spinner} aria-hidden="true" />}
      {children}
    </button>
  );
}

const STATUS = {
  submitted: { label: 'Submitted', tone: 'ok' },
  reopened: { label: 'Reopened', tone: 'warn' },
  closed: { label: 'Missed', tone: 'danger' },
};

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

  return (
    <SectionShell
      title="Submissions"
      description="Set deadlines and review the documents your student has submitted"
    >
      <form
        onSubmit={handleCreateRequirement}
        className={`${styles.createForm} ${ui.panel}`}
        noValidate
      >
        <label className={`${ui.field} ${ui.fieldGrow}`}>
          <span className={ui.label}>New requirement: due date and time</span>
          <input
            className={ui.input}
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>
        <ActionButton type="submit" loading={creating}>
          Create requirement
        </ActionButton>
      </form>

      {error && <p className={ui.error} role="alert">{error}</p>}

      <div>
        <h3 className={ui.subTitle}>
          Required submissions
          {submissions && <span className={ui.count}>{requirements.length}</span>}
        </h3>

        {submissions === null && !error && <p className={ui.loading}>Loading submissions…</p>}

        {submissions && requirements.length === 0 && (
          <EmptyBlock icon="calendar" title="No submission requirements yet">
            Create a requirement above to set a deadline for your student.
          </EmptyBlock>
        )}

        {requirements.length > 0 && (
          <ul className={ui.list}>
            {requirements.map((s) => {
              const status = STATUS[s.state] || { label: 'Open', tone: 'neutral' };
              return (
                <li key={s.id} className={styles.item}>
                  <div className={styles.itemHead}>
                    <strong className={styles.itemTitle}>Industry supervisor requirement</strong>
                    <Pill tone={status.tone}>{status.label}</Pill>
                  </div>

                  <span className={styles.meta}>Due {new Date(s.due_date).toLocaleString()}</span>

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
                      <label className={`${ui.field} ${styles.fieldPenalty}`}>
                        <span className={ui.label}>Penalty %</span>
                        <input
                          className={ui.input}
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={penalties[s.id] ?? ''}
                          onChange={(e) =>
                            setPenalties((current) => ({ ...current, [s.id]: e.target.value }))
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
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <h3 className={ui.subTitle}>
          Submitted documents
          {submissions && <span className={ui.count}>{normalSubmissions.length}</span>}
        </h3>

        {submissions && normalSubmissions.length === 0 && (
          <EmptyBlock icon="file" title="No documents submitted yet">
            Files your student uploads will appear here.
          </EmptyBlock>
        )}

        {normalSubmissions.length > 0 && (
          <ul className={ui.list}>
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
      </div>
    </SectionShell>
  );
}
