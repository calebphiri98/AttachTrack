import { useEffect, useState } from 'react';
import { Card, EmptyState } from '../../../components/shared/Card';
import * as feedbackApi from '../../../api/feedback.api';
import styles from './FeedbackSection.module.css';

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
    <div className={styles.surface}>
      <Card>
        <div className={styles.heading}>
          <div>
            <span className={styles.eyebrow}>SUPERVISOR INSIGHTS</span>
            <h2 className="section-title">Feedback</h2>
            <p>Comments and recommendations from your supervisors.</p>
          </div>
          {records && <span className={styles.count}>{records.length} {records.length === 1 ? 'note' : 'notes'}</span>}
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {records === null && !error && <p className={styles.muted}>Loading feedback…</p>}
        {records && records.length === 0 && <EmptyState>No feedback has been shared yet.</EmptyState>}
        {records && records.length > 0 && (
          <ul className={styles.list}>
            {records.map((item) => (
              <li key={item.id} className={styles.item}>
                <div className={styles.meta}>
                  <span className={styles.date}>{new Date(item.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  {item.flagged_concern && <span className={styles.flag}>Needs attention</span>}
                </div>
                <p className={styles.content}>{item.content}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
