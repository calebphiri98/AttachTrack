import { Link } from 'react-router-dom';
import PortalLayout from '../shared/PortalLayout';
import StatusBadge from '../shared/StatusBadge';
import ExportButton from '../shared/ExportButton';
import StudentAvatar from './StudentAvatar';
import * as reportsApi from '../../api/reports.api';
import '../../styles/portalSections.css';
import './supervisor.tokens.css';
import styles from './StudentProfileLayout.module.css';

export default function StudentProfileLayout({
  student,
  studentId,
  listPath,
  assessmentPath,
  sections,
}) {
  async function handleExport() {
    if (!studentId) return;
    const csv = await reportsApi.exportStudentReport(studentId);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${student?.name || 'student'}-report.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PortalLayout
      eyebrow={
        <Link to={listPath} className={styles.back}>
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <path d="m12 4-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to students
        </Link>
      }
      title={student ? student.name : 'Student'}
    >
      <header className={styles.profile}>
        {student ? (
          <>
            <StudentAvatar name={student.name} email={student.email} size="lg" />
            <div className={styles.identity}>
              <div className={styles.identityTop}>
                <h2 className={styles.profileName}>{student.name || student.email}</h2>
                <StatusBadge>{student.link_status}</StatusBadge>
              </div>
              <dl className={styles.facts}>
                <div>
                  <dt>Email</dt>
                  <dd>{student.email}</dd>
                </div>
                {student.location && (
                  <div>
                    <dt>Location</dt>
                    <dd>{student.location}</dd>
                  </div>
                )}
              </dl>
            </div>
            <div className={styles.actions}>
              <Link to={assessmentPath} className="btn btn--ghost">
                Assessment
              </Link>
              <ExportButton onClick={handleExport}>Export report</ExportButton>
            </div>
          </>
        ) : (
          <p className={styles.loading}>Loading student…</p>
        )}
      </header>

      <nav className={styles.jump} aria-label="Sections">
        {sections.map((section) => (
          <a key={section.id} href={`#${section.id}`} className={styles.jumpLink}>
            {section.label}
          </a>
        ))}
      </nav>

      <div className={styles.stack}>
        {sections.map((section) => (
          <div key={section.id} id={section.id} className={styles.anchor}>
            {section.node}
          </div>
        ))}
      </div>
    </PortalLayout>
  );
}
