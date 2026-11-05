import styles from './SubmissionReceipt.module.css';

export default function SubmissionReceipt({ record }) {
  if (!record?.file_url) return null;
  const date = record.synced_at || record.submitted_at;
  const receivedAt = date && !Number.isNaN(new Date(date).valueOf())
    ? new Date(date).toLocaleString()
    : null;
  return (
    <div className={styles.receipt} role="status">
      <span className={styles.mark} aria-hidden="true">✓</span>
      <div>
        <strong>Received by AttachTrack</strong>
        <p>{receivedAt ? `Stored on server: ${receivedAt}` : 'File recorded on the server.'}</p>
        <small>Supervisor review is not recorded in this submission status.</small>
      </div>
    </div>
  );
}
