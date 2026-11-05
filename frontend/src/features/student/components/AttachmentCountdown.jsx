import { calculateAttachmentProgress } from '../utils/attachmentProgress.mjs';
import styles from './AttachmentCountdown.module.css';

function humanDate(value) {
  return new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

export default function AttachmentCountdown({ placement }) {
  const start = placement?.attachment_start_date;
  const end = placement?.attachment_end_date;
  const progress = calculateAttachmentProgress(start, end);
  if (!progress) {
    return (
      <section className={styles.root} aria-label="Attachment duration">
        <h3>Attachment duration</h3>
        <p>The Coordinator has not entered your attachment start and end dates yet.</p>
      </section>
    );
  }
  const summary = progress.upcoming
    ? 'Attachment not yet started'
    : progress.completed
      ? 'Attachment period ended'
      : `${progress.remaining} calendar day${progress.remaining === 1 ? '' : 's'} remaining`;
  return (
    <section className={styles.root} aria-label="Attachment duration">
      <div className={styles.top}>
        <div><h3>Attachment duration</h3><p>{summary}</p></div>
        <strong>{progress.percent}%</strong>
      </div>
      <div className={styles.track} role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Attachment time elapsed">
        <span style={{ width: `${progress.percent}%` }} />
      </div>
      <div className={styles.dates}><span>Starts {humanDate(start)}</span><span>Ends {humanDate(end)}</span></div>
      <small>Calendar-time progress, not academic completion or attendance.</small>
    </section>
  );
}
