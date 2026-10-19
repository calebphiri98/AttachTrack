import { useEffect, useState } from 'react';
import * as feedbackApi from '../../../api/feedback.api';
import SectionShell, { EmptyBlock, Pill } from '../../../components/supervisor/SectionShell';
import ui from '../../../components/supervisor/controls.module.css';
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

  useEffect(() => {
    feedbackApi
      .listFeedbackForStudent(studentId)
      .then((res) => setRecords(res.data))
      .catch((err) => setError(err.message));
  }, [studentId]);

  const description = records && records.length > 0
    ? `${records.length} note${records.length === 1 ? '' : 's'} from the industry supervisor`
    : 'Notes written by the industry supervisor';

  return (
    <SectionShell title="Feedback" description={description}>
      {error && <p className={ui.error} role="alert">{error}</p>}
      {records === null && !error && <p className={ui.loading}>Loading feedback…</p>}

      {records && records.length === 0 && (
        <EmptyBlock icon="chat" title="No feedback yet">
          Feedback from the industry supervisor will appear here.
        </EmptyBlock>
      )}

      {records && records.length > 0 && (
        <ul className={ui.list}>
          {records.map((f) => (
            <li
              key={f.id}
              className={`${styles.entry} ${f.flagged_concern ? styles.entryConcern : ''}`}
            >
              <div className={styles.entryHead}>
                <span className={styles.date}>{formatDate(f.created_at)}</span>
                {f.flagged_concern && <Pill tone="danger">Concern</Pill>}
              </div>
              <p className={styles.content}>{f.content}</p>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}
