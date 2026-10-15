import { Link } from 'react-router-dom';
import AttendanceList from '../../../components/shared/AttendanceList';

export default function AttendanceSection({ studentId }) {
  return (
    <AttendanceList
      studentId={studentId}
      action={
        <Link to={`/industry/attendance?student=${studentId}`} className="btn btn--primary">
          Record attendance
        </Link>
      }
    />
  );
}