import { useLocation, useParams } from 'react-router-dom';
import StudentProfileLayout from '../../../components/supervisor/StudentProfileLayout';
import LogbookPanel from '../../../components/supervisor/LogbookPanel';
import AttendanceSection from '../components/AttendanceSection';
import FeedbackSection from '../components/FeedbackSection';
import SubmissionsSection from '../components/SubmissionsSection';
import * as industrySupervisorsApi from '../../../api/industrySupervisors.api';
import useResolvedStudent from '../../shared/hooks/useResolvedStudent';

export default function StudentDetailPage() {
  const { studentId } = useParams();
  const location = useLocation();
  const student = useResolvedStudent(
    studentId,
    location.state?.student,
    industrySupervisorsApi.listMyStudents
  );

  const sections = [
    { id: 'attendance', label: 'Attendance', node: <AttendanceSection studentId={studentId} /> },
    { id: 'feedback', label: 'Feedback', node: <FeedbackSection studentId={studentId} /> },
    { id: 'submissions', label: 'Submissions', node: <SubmissionsSection studentId={studentId} /> },
    { id: 'logbook', label: 'Logbook', node: <LogbookPanel studentId={studentId} /> },
  ];

  return (
    <StudentProfileLayout
      student={student}
      studentId={studentId}
      listPath="/industry/students"
      assessmentPath={`/industry/assessments/${studentId}`}
      sections={sections}
    />
  );
}
