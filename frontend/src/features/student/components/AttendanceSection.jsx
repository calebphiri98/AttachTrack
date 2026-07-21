import { useEffect, useState } from 'react';
import { Card, EmptyState } from '../../../components/shared/Card';
import StatusBadge from '../../../components/shared/StatusBadge';
import * as attendanceApi from '../../../api/attendance.api';

export default function AttendanceSection({ studentId }) {
  const [records, setRecords] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    attendanceApi
      .listAttendanceForStudent(studentId)
      .then((res) => setRecords(res.data))
      .catch((err) => setError(err.message));
  }, [studentId]);

  return (
    <Card>
      <h2 className="section-title">Attendance</h2>
      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}
      {records === null && !error && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
      {records && records.length === 0 && <EmptyState>No attendance marked yet.</EmptyState>}
      {records && records.length > 0 && (
        <ul className="record-list">
          {records.map((r) => (
            <li key={r.id} className="record-list__row">
              <span className="record-list__date">
                {new Date(r.week_start_date).toLocaleDateString()}
              </span>
              <StatusBadge>{r.status}</StatusBadge>
              {r.notes && <span className="record-list__notes">{r.notes}</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}