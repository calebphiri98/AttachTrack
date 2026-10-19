import { Link, useLocation, useParams } from 'react-router-dom';
import PortalLayout from '../../../components/shared/PortalLayout';
import StatusBadge from '../../../components/shared/StatusBadge';
import ExportButton from '../../../components/shared/ExportButton';
import AttendanceSection from '../components/AttendanceSection';
import FeedbackSection from '../components/FeedbackSection';
import SubmissionsSection from '../components/SubmissionsSection';
import StudentAvatar from '../components/StudentAvatar';
import LogbookPanel from '../components/LogbookPanel';
import * as reportsApi from '../../../api/reports.api';
import * as industrySupervisorsApi from '../../../api/industrySupervisors.api';
import useResolvedStudent from '../../shared/hooks/useResolvedStudent';
import '../../../styles/portalSections.css';
import '../styles/supervisor.tokens.css';
import styles from './StudentDetailPage.module.css';

const SECTIONS = [
  { id: 'attendance', label: 'Attendance' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'logbook', label: 'Logbook' },
];

export default function StudentDetailPage() {
  const { studentId } = useParams();
  const location = useLocation();
  const student = useResolvedStudent(
    studentId,
    location.state?.student,
    industrySupervisorsApi.listMyStudents
  );

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
        <Link to="/industry/students" className={styles.back}>
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
              <Link to={`/industry/assessments/${studentId}`} className="btn btn--ghost">
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
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className={styles.jumpLink}>
            {s.label}
          </a>
        ))}
      </nav>

      <div className={styles.stack}>
        <div id="attendance" className={styles.anchor}>
          <AttendanceSection studentId={studentId} />
        </div>
        <div id="feedback" className={styles.anchor}>
          <FeedbackSection studentId={studentId} />
        </div>
        <div id="submissions" className={styles.anchor}>
          <SubmissionsSection studentId={studentId} />
        </div>
        <div id="logbook" className={styles.anchor}>
          <LogbookPanel studentId={studentId} />
        </div>
      </div>
    </PortalLayout>
  );
}
