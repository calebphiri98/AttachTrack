import { useEffect, useState } from 'react';
import { Card, EmptyState } from '../../../components/shared/Card';
import StatusBadge from '../../../components/shared/StatusBadge';
import StampButton from '../../../components/shared/StampButton';
import * as feedbackApi from '../../../api/feedback.api';

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
    <Card>
      <h2 className="section-title">Feedback</h2>

      <form onSubmit={handleSubmit} className="inline-form">
        <label className="inline-form__field inline-form__field--full">
          <span>New feedback</span>
          <textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="How is the student doing this week?"
          />
        </label>
        <label className="inline-form__checkbox">
          <input
            type="checkbox"
            checked={flaggedConcern}
            onChange={(e) => setFlaggedConcern(e.target.checked)}
          />
          <span>Flag this as a concern</span>
        </label>
        {error && <p className="inline-form__error">{error}</p>}
        <StampButton type="submit" loading={saving} style={{ width: 'auto', padding: '9px 20px' }}>
          Save feedback
        </StampButton>
      </form>

      <div className="section-divider" />

      {records === null && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
      {records && records.length === 0 && <EmptyState>No feedback written yet.</EmptyState>}
      {records && records.length > 0 && (
        <ul className="record-list record-list--stacked">
          {records.map((r) => (
            <li key={r.id} className="record-list__entry">
              <div className="record-list__entry-header">
                <span className="record-list__date">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
                {r.flagged_concern && <StatusBadge tone="negative">Concern</StatusBadge>}
              </div>
              <p className="record-list__content">{r.content}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
