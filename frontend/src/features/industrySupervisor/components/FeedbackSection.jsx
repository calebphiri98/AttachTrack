import { useEffect, useState } from 'react';
import * as feedbackApi from '../../../api/feedback.api';
import SectionShell, { EmptyBlock, Pill } from './SectionShell';
import ui from '../styles/controls.module.css';
import styles from './FeedbackSection.module.css';

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function FeedbackSection({ studentId }) {
  const [records, setRecords] = useState(null);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [flaggedConcern, setFlaggedConcern] = useState(false);
  const [saving, setSaving] = useState(false);

  function load() {
    feedbackApi
      .listFeedbackForStudent(studentId)
      .then((res) => setRecords(res.data))
      .catch((err) => setError(err.message));
  }

  useEffect(load, [studentId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!content.trim()) {
      setError('Write something before saving feedback');
      return;
    }
    setSaving(true);
    try {
      await feedbackApi.createFeedback({ studentId, content, flaggedConcern });
      setContent('');
      setFlaggedConcern(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionShell
      title="Feedback"
      description="Share progress notes and flag anything that needs attention"
    >
      <form onSubmit={handleSubmit} className={`${ui.form} ${ui.panel}`} noValidate>
        <h3 className={ui.panelTitle}>Write feedback</h3>

        <label className={ui.field}>
          <span className={ui.label}>Your note</span>
          <textarea
            className={ui.textarea}
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="How is the student doing this week?"
          />
        </label>

        <label className={ui.checkbox}>
          <input
            type="checkbox"
            checked={flaggedConcern}
            onChange={(e) => setFlaggedConcern(e.target.checked)}
          />
          <span>Flag this as a concern</span>
        </label>

        {error && <p className={ui.error} role="alert">{error}</p>}

        <div className={ui.actions}>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving && <span className={ui.spinner} aria-hidden="true" />}
            Save feedback
          </button>
        </div>
      </form>

      <div>
        <h3 className={ui.subTitle}>
          Previous feedback
          {records && <span className={ui.count}>{records.length}</span>}
        </h3>

        {records === null && <p className={ui.loading}>Loading feedback…</p>}

        {records && records.length === 0 && (
          <EmptyBlock icon="chat" title="No feedback written yet">
            Your notes to the student will appear here.
          </EmptyBlock>
        )}

        {records && records.length > 0 && (
          <ul className={ui.list}>
            {records.map((r) => (
              <li
                key={r.id}
                className={`${styles.entry} ${r.flagged_concern ? styles.entryConcern : ''}`}
              >
                <div className={styles.entryHead}>
                  <span className={styles.date}>{formatDate(r.created_at)}</span>
                  {r.flagged_concern && <Pill tone="danger">Concern</Pill>}
                </div>
                <p className={styles.content}>{r.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionShell>
  );
}
