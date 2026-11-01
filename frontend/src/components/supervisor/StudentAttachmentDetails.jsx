import AttachmentLocation from './AttachmentLocation';
import styles from './StudentAttachmentDetails.module.css';

export default function StudentAttachmentDetails({ student }) {
  if (!student) return null;
  const items = [
    ['Email', student.email],
    ['Organisation', student.company_name],
    ['Industry sector', student.industry_sector],
    ['Area of interest', student.area_interest],
    ['Programme', student.programme],
  ];

  return (
    <section className={styles.card} aria-label="Student attachment details">
      <div className={styles.head}>
        <h2>Attachment details</h2>
        <p>Verified student and placement information</p>
      </div>
      <dl className={styles.grid}>
        {items.map(([label, value]) => (
          <div key={label} className={styles.field}>
            <dt>{label}</dt>
            <dd>{value || 'Not provided'}</dd>
          </div>
        ))}
      </dl>
      <AttachmentLocation companyName={student.company_name} address={student.company_address} />
    </section>
  );
}
