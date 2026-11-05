import { Link } from 'react-router-dom';
import PortalLayout from '../shared/PortalLayout';
import StatusBadge from '../shared/StatusBadge';
import ExportButton from '../shared/ExportButton';
import StudentAvatar from './StudentAvatar';
import StudentAttachmentDetails from './StudentAttachmentDetails';
import * as reportsApi from '../../api/reports.api';
import { downloadReport } from '../../utils/downloadReport';
import { useState } from 'react';
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
  const [exportError, setExportError] = useState('');

  async function handleExport(format) {
    if (!studentId) return;
    try {
      setExportError('');
      const blob = await reportsApi.exportStudentReport(studentId, format);
      downloadReport(blob, `${student?.name || 'student'}-report`, format);
    } catch (err) {
      setExportError(err.message);
    }
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
      {exportError && <p role="alert">{exportError}</p>}
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

      {student && <StudentAttachmentDetails student={student} />}

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
