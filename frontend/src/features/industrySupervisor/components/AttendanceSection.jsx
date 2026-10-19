import { Link } from 'react-router-dom';
import AttendancePanel from './AttendancePanel';

export default function AttendanceSection({ studentId }) {
  return (
    <AttendancePanel
      studentId={studentId}
      action={
        <Link to={`/industry/attendance?student=${studentId}`} className="btn btn--primary">
          Record attendance
        </Link>
      }
    />
  );
}
