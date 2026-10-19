import { useEffect, useMemo, useState } from 'react';
import * as logbooksApi from '../../api/logbooks.api';
import SectionShell, { EmptyBlock, Pill } from './SectionShell';
import ui from './controls.module.css';
import styles from './LogbookPanel.module.css';

const STATUS = {
  draft: { label: 'Draft', tone: 'neutral' },
  submitted: { label: 'Awaiting review', tone: 'info' },
  approved: { label: 'Approved', tone: 'ok' },
  returned: { label: 'Returned', tone: 'warn' },
};

function formatDay(value) {
  if (!value) return '';
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function entryHours(entry) {
  if (!entry.start_time || !entry.end_time) return 0;
  const [startHour, startMinute] = entry.start_time.split(':').map(Number);
  const [endHour, endMinute] = entry.end_time.split(':').map(Number);
  return Math.max(0, (endHour * 60 + endMinute - (startHour * 60 + startMinute)) / 60);
}

const plural = (n) => `${n} entr${n === 1 ? 'y' : 'ies'}`;

export default function LogbookPanel({ studentId, canReview = true }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [returning, setReturning] = useState(null);

  async function loadEntries() {
    try {
      const res = await logbooksApi.getStudentLogbook(studentId);
      setEntries(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    setError('');
    setMessage('');
    loadEntries();
  }, [studentId]);

  const weeks = useMemo(() => {
    const map = new Map();
    entries.forEach((entry) => {
      if (!map.has(entry.week_start)) map.set(entry.week_start, []);
      map.get(entry.week_start).push(entry);
    });
    return Array.from(map, ([weekStart, items]) => ({ weekStart, items }));
  }, [entries]);

  async function run(key, action, successText) {
    setBusyKey(key);
    setError('');
    setMessage('');
    try {
      const res = await action();
      setMessage(successText(res.data));
      await loadEntries();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  }

  function handleApprove(week) {
    if (!window.confirm('Approve all submitted entries for this week?')) return;
    run(
      `week:${week.weekStart}`,
      () => logbooksApi.reviewLogbookWeek(studentId, week.weekStart, { decision: 'approve' }),
      (data) => `${plural(data.reviewed)} approved.`
    );
  }

  async function handleReturn(week) {
    if (!returning || !returning.comment.trim()) {
      setError('Add a comment explaining what needs to be fixed');
      return;
    }
    await run(
      `week:${week.weekStart}`,
      () =>
        logbooksApi.reviewLogbookWeek(studentId, week.weekStart, {
          decision: 'return',
          comment: returning.comment,
        }),
      (data) => `${plural(data.reviewed)} returned to the student.`
    );
    setReturning(null);
  }

  const description = entries.length > 0
    ? `${plural(entries.length)} across ${weeks.length} week${weeks.length === 1 ? '' : 's'}`
    : 'Weekly activity logs written by your student';

  return (
    <SectionShell title="Logbook" description={description}>
      {error && <p className={ui.error} role="alert">{error}</p>}
      {message && <p className={ui.message} role="status">{message}</p>}
      {loading && <p className={ui.loading}>Loading logbook…</p>}

      {!loading && entries.length === 0 && (
        <EmptyBlock icon="book" title="No logbook entries yet">
          Entries appear here once your student starts logging their daily work.
        </EmptyBlock>
      )}

      {weeks.map((week) => {
        const hours = week.items.reduce((sum, entry) => sum + entryHours(entry), 0);
        const submittedCount = week.items.filter((entry) => entry.status === 'submitted').length;
        const weekBusy = busyKey === `week:${week.weekStart}`;
        const isReturning = returning && returning.weekStart === week.weekStart;

        return (
          <article key={week.weekStart} className={styles.week}>
            <div className={styles.weekHead}>
              <div>
                <h3 className={styles.weekTitle}>Week of {formatDay(week.weekStart)}</h3>
                <span className={styles.weekMeta}>
                  {plural(week.items.length)}
                  {hours > 0 ? `, ${hours.toFixed(1)} hours logged` : ''}
                </span>
              </div>

              {canReview && submittedCount > 0 && (
                <div className={styles.weekActions}>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => handleApprove(week)}
                    disabled={Boolean(busyKey)}
                  >
                    {weekBusy ? 'Saving…' : `Approve week (${submittedCount})`}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => setReturning({ weekStart: week.weekStart, comment: '' })}
                    disabled={Boolean(busyKey)}
                  >
                    Return week
                  </button>
                </div>
              )}
            </div>

            {isReturning && (
              <div className={`${ui.form} ${styles.returnBox}`}>
                <label className={ui.field}>
                  <span className={ui.label}>What needs to be fixed?</span>
                  <textarea
                    className={ui.textarea}
                    rows={3}
                    value={returning.comment}
                    onChange={(e) => setReturning({ ...returning, comment: e.target.value })}
                    maxLength={2000}
                  />
                </label>
                <div className={ui.actions}>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => handleReturn(week)}
                    disabled={Boolean(busyKey)}
                  >
                    Return to student
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => setReturning(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <ul className={styles.entries}>
              {week.items.map((entry) => {
                const status = STATUS[entry.status] || { label: entry.status, tone: 'neutral' };
                return (
                  <li key={entry.id} className={styles.entry}>
                    <div className={styles.entryHead}>
                      <div>
                        <strong className={styles.entryDate}>{formatDay(entry.entry_date)}</strong>
                        {(entry.start_time || entry.end_time) && (
                          <span className={styles.entryTime}>
                            {entry.start_time || '?'} to {entry.end_time || '?'}
                          </span>
                        )}
                      </div>
                      <Pill tone={status.tone}>{status.label}</Pill>
                    </div>

                    <p className={styles.task}>{entry.activity}</p>

                    <dl className={styles.details}>
                      {entry.description && (
                        <div className={styles.detailWide}>
                          <dt>Description</dt>
                          <dd>{entry.description}</dd>
                        </div>
                      )}
                      {entry.skills_learned && (
                        <div>
                          <dt>Skills learned</dt>
                          <dd>{entry.skills_learned}</dd>
                        </div>
                      )}
                      {entry.challenges && (
                        <div>
                          <dt>Challenges</dt>
                          <dd>{entry.challenges}</dd>
                        </div>
                      )}
                      {entry.tools_used && (
                        <div>
                          <dt>Tools used</dt>
                          <dd>{entry.tools_used}</dd>
                        </div>
                      )}
                      {entry.notes && (
                        <div className={styles.detailWide}>
                          <dt>Notes</dt>
                          <dd>{entry.notes}</dd>
                        </div>
                      )}
                    </dl>

                    {entry.files && entry.files.length > 0 && (
                      <div className={styles.files}>
                        {entry.files.map((file) => (
                          <a
                            key={file.id}
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.fileChip}
                          >
                            {file.name}
                          </a>
                        ))}
                      </div>
                    )}

                    {entry.review_comment && (
                      <div className={styles.review}>
                        <span className={styles.reviewLabel}>Review comment</span>
                        {entry.review_comment}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </article>
        );
      })}
    </SectionShell>
  );
}
