import { useLocation, useParams, useNavigate } from 'react-router-dom';
import PortalLayout from '../../../components/shared/PortalLayout';
import StatusBadge from '../../../components/shared/StatusBadge';
import AttendanceSection from '../components/AttendanceSection';
import FeedbackSection from '../components/FeedbackSection';
import SubmissionsSection from '../components/SubmissionsSection';
import '../../../styles/portalSections.css';

export default function StudentDetailPage() {
  const { studentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const student = location.state?.student;

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
      actions={student && <StatusBadge>{student.link_status}</StatusBadge>}
    >
      {student && <p style={{ color: 'var(--muted)', marginTop: -16, marginBottom: 24 }}>{student.email}</p>}

      <AttendanceSection studentId={studentId} />
      <FeedbackSection studentId={studentId} />
      <SubmissionsSection studentId={studentId} />
    </PortalLayout>
  );
}
