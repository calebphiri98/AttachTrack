import { useEffect, useMemo, useState } from 'react';
import { Card, EmptyState } from './Card';
import StatusBadge from './StatusBadge';
import SyncChip from './SyncChip';
import * as attendanceApi from '../../api/attendanceLog.api';
import { useOutbox, useSyncRefresh } from '../../offline/hooks';
import { mergeAttendance } from '../../offline/overlays';

const REASON_LABELS = {
  sick: 'Sick',
  transport: 'Transport',
  permission: 'Permission granted',
  other: 'Other',
};

const PAGE_SIZE = 20;

function formatDay(value) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function countStatus(records, status) {
  return records.filter((record) => record.status === status).length;
}

export default function AttendanceList({ studentId, action }) {
  const [serverRecords, setServerRecords] = useState(null);
  const outbox = useOutbox();
  const records = useMemo(
    () => (serverRecords ? mergeAttendance(serverRecords, outbox, studentId) : null),
    [serverRecords, outbox, studentId]
  );
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);

  function load() {
    attendanceApi
      .getStudentAttendance(studentId)
      .then((res) => setServerRecords(res.data))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    setServerRecords(null);
    setError('');
    setVisible(PAGE_SIZE);
    load();
  }, [studentId]);

  useSyncRefresh(load);

  return (
    <Card>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <h2 className="section-title" style={{ margin: 0 }}>
          Attendance
        </h2>
        {action}
      </div>

      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}
      {records === null && !error && <p style={{ color: 'var(--muted)' }}>Loading...</p>}
      {records && records.length === 0 && <EmptyState>No attendance recorded yet.</EmptyState>}

      {records && records.length > 0 && (
        <>
          <p style={{ color: 'var(--muted)', margin: '0 0 12px', fontSize: '0.9rem' }}>
            {records.length} day{records.length === 1 ? '' : 's'} recorded:{' '}
            {countStatus(records, 'present')} present, {countStatus(records, 'absent')} absent,{' '}
            {countStatus(records, 'excused')} excused, {countStatus(records, 'partial')} partial
          </p>

          <ul className="record-list">
            {records.slice(0, visible).map((record) => (
              <li key={record.id} className="record-list__row">
                <span className="record-list__date">{formatDay(record.attendance_date)}</span>
                <StatusBadge>{record.status}</StatusBadge>
                {record._sync && <SyncChip sync={record._sync} showError={false} />}
                {record.reason && (
                  <span style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
                    {REASON_LABELS[record.reason] || record.reason}
                  </span>
                )}
                {record.notes && <span className="record-list__notes">{record.notes}</span>}
                {record.marked_by_name && (
                  <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
                    Recorded by {record.marked_by_name}
                  </span>
                )}
              </li>
            ))}
          </ul>

          {records.length > visible && (
            <button
              type="button"
              className="btn btn--ghost"
              style={{ marginTop: 12 }}
              onClick={() => setVisible((count) => count + PAGE_SIZE)}
            >
              Show more
            </button>
          )}
        </>
      )}
    </Card>
  );
}

