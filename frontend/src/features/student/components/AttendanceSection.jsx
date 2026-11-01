import styles from './AttendanceSection.module.css';
import AttendanceList from '../../../components/shared/AttendanceList';

export default function AttendanceSection({ studentId }) {
  return <div className={styles.surface}><div className={styles.header}><span className={styles.eyebrow}>ATTENDANCE RECORD</span><h2>Attendance</h2><p>Review your attachment attendance and recorded days.</p></div><AttendanceList studentId={studentId} /></div>;
}
