import { useEffect, useState } from 'react';
import { Card, EmptyState } from '../../../components/shared/Card';
import * as feedbackApi from '../../../api/feedback.api';

export default function FeedbackSection({ studentId }) {
  const [records, setRecords] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    feedbackApi
      .listFeedbackForStudent(studentId)
      .then((res) => setRecords(res.data))
      .catch((err) => setError(err.message));
  }, [studentId]);

  return (
    <Card>
      <h2 className="section-title">Feedback</h2>
      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}
      {records === null && !error && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
      {records && records.length === 0 && <EmptyState>No feedback yet.</EmptyState>}
      {records && records.length > 0 && (
        <ul className="record-list">
          {records.map((f) => (
            <li key={f.id} className="record-list__row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span className="record-list__date">
                  {new Date(f.created_at).toLocaleDateString()}
                </span>
                {f.flagged_concern && (
                  <span style={{ color: 'var(--error)', fontSize: '0.8rem', fontWeight: 600 }}>
                    Flagged
                  </span>
                )}
              </div>
              <p style={{ margin: '6px 0 0', color: 'var(--ink)' }}>{f.content}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}