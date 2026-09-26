import { useLocation, useParams, useNavigate } from 'react-router-dom';
import PortalLayout from '../../../components/shared/PortalLayout';
import StatusBadge from '../../../components/shared/StatusBadge';
import AttendanceSection from '../components/AttendanceSection';
import FeedbackSection from '../components/FeedbackSection';
import SubmissionsSection from '../components/SubmissionsSection';
import LogbookSection from '../../student/components/LogbookSection';
import ExportButton from '../../../components/shared/ExportButton';
import * as reportsApi from '../../../api/reports.api';
import '../../../styles/portalSections.css';

export default function StudentDetailPage() {
  const { studentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const student = location.state?.student;

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
        <button
          onClick={() => navigate('/industry/students')}
          style={{
            border: 'none',
            background: 'none',
            color: 'var(--stamp)',
            cursor: 'pointer',
            padding: 0,
            font: 'inherit',
            letterSpacing: 'inherit',
            textTransform: 'inherit',
          }}
        >
          ← Students
        </button>
      }
      title={student ? student.name : 'Student'}
      actions={
        student ? (
          <>
            <StatusBadge>{student.link_status}</StatusBadge>
            <ExportButton onClick={handleExport}>Export report</ExportButton>
          </>
        ) : null
      }
    >
      {student && (
        <>
          <p style={{ color: 'var(--muted)', marginTop: -16, marginBottom: 8 }}>{student.email}</p>
          {student.location && (
            <p style={{ color: 'var(--muted)', marginTop: 0, marginBottom: 24 }}>{student.location}</p>
          )}
        </>
      )}

      <AttendanceSection studentId={studentId} />
      <FeedbackSection studentId={studentId} />
      <SubmissionsSection studentId={studentId} />
      <LogbookSection studentId={studentId} />
    </PortalLayout>
  );
}
