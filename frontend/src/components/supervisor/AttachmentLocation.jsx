import styles from './AttachmentLocation.module.css';

export default function AttachmentLocation({ companyName, address }) {
  const addressText = typeof address === 'string' ? address.trim() : '';
  const companyText = typeof companyName === 'string' ? companyName.trim() : '';
  const query = addressText ? [companyText, addressText].filter(Boolean).join(', ') : '';
  const mapsUrl = query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;

  return (
    <section className={styles.card} aria-label="Attachment location">
      <div className={styles.heading}>
        <h3>Attachment location</h3>
        <span className={styles.tag}>Google Maps</span>
      </div>
      <p className={styles.address}>{addressText || 'Organisation address not yet provided.'}</p>
      {mapsUrl ? (
        <a className={styles.link} href={mapsUrl} target="_blank" rel="noopener noreferrer">
          Open in Google Maps <span aria-hidden="true">↗</span>
        </a>
      ) : (
        <p className={styles.help}>Ask the coordinator to add the organisation's physical address.</p>
      )}
      {mapsUrl && <p className={styles.help}>Map search results depend on the accuracy of the recorded address.</p>}
    </section>
  );
}
