import { useEffect, useState } from 'react';
import * as feedbackApi from '../../../api/feedback.api';
import styles from './FeedbackSection.module.css';

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
    <section className={styles.card}>
      <h2 className={styles.title}>Feedback</h2>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <label className={styles.field}>
          <span className={styles.label}>New feedback</span>
          <textarea
            className={styles.textarea}
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="How is the student doing this week?"
          />
        </label>

        <label className={styles.checkbox}>
          <input
            className={styles.checkboxInput}
            type="checkbox"
            checked={flaggedConcern}
            onChange={(e) => setFlaggedConcern(e.target.checked)}
          />
          <span>Flag this as a concern</span>
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button type="submit" className={styles.button} disabled={saving}>
            {saving && <span className={styles.spinner} aria-hidden="true" />}
            Save feedback
          </button>
        </div>
      </form>

      <hr className={styles.divider} />

      {records === null && <p className={styles.loading}>Loading…</p>}

      {records && records.length === 0 && (
        <p className={styles.empty}>No feedback written yet.</p>
      )}

      {records && records.length > 0 && (
        <ul className={styles.list}>
          {records.map((r) => (
            <li
              key={r.id}
              className={`${styles.entry} ${r.flagged_concern ? styles.entryConcern : ''}`}
            >
              <div className={styles.entryHeader}>
                <span className={styles.date}>
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
                {r.flagged_concern && <span className={styles.badge}>Concern</span>}
              </div>
              <p className={styles.content}>{r.content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}