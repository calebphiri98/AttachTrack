import { useEffect, useMemo, useState } from 'react';
import SyncChip from '../shared/SyncChip';
import * as attendanceApi from '../../api/attendanceLog.api';
import { useOutbox, useSyncRefresh } from '../../offline/hooks';
import { mergeAttendance } from '../../offline/overlays';
import SectionShell, { EmptyBlock, Pill } from './SectionShell';
import ui from './controls.module.css';
import styles from './AttendancePanel.module.css';

const PAGE_SIZE = 20;

const REASON_LABELS = {
  sick: 'Sick',
  transport: 'Transport',
  permission: 'Permission granted',
  other: 'Other',
};

const STATUS_TONES = {
  present: 'ok',
  absent: 'danger',
  excused: 'info',
  partial: 'warn',
};

const SUMMARY = [
  { key: 'present', label: 'Present' },
  { key: 'absent', label: 'Absent' },
  { key: 'excused', label: 'Excused' },
  { key: 'partial', label: 'Partial' },
];

function formatDay(value) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function AttendancePanel({ studentId, action }) {
  const [serverRecords, setServerRecords] = useState(null);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const outbox = useOutbox();

  const records = useMemo(
    () => (serverRecords ? mergeAttendance(serverRecords, outbox, studentId) : null),
    [serverRecords, outbox, studentId]
  );

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

  const counts = useMemo(() => {
    const result = {};
    (records || []).forEach((r) => {
      result[r.status] = (result[r.status] || 0) + 1;
    });
    return result;
  }, [records]);

  const description = records && records.length > 0
    ? `${records.length} day${records.length === 1 ? '' : 's'} recorded`
    : 'Daily attendance for this student';

  return (
    <SectionShell title="Attendance" description={description} action={action}>
      {error && <p className={ui.error} role="alert">{error}</p>}
      {records === null && !error && <p className={ui.loading}>Loading attendance…</p>}

      {records && records.length === 0 && (
        <EmptyBlock icon="calendar" title="No attendance recorded yet">
          Use Record attendance to log the first day.
        </EmptyBlock>
      )}

      {records && records.length > 0 && (
        <>
          <ul className={styles.summary} aria-label="Attendance summary">
            {SUMMARY.map((item) => (
              <li key={item.key} className={`${styles.tile} ${styles[item.key]}`}>
                <span className={styles.tileValue}>{counts[item.key] || 0}</span>
                <span className={styles.tileLabel}>{item.label}</span>
              </li>
            ))}
          </ul>

          <ul className={styles.rows}>
            {records.slice(0, visible).map((record) => (
              <li key={record.id} className={styles.row}>
                <span className={styles.date}>{formatDay(record.attendance_date)}</span>
                <span className={styles.status}>
                  <Pill tone={STATUS_TONES[record.status] || 'neutral'}>
                    {String(record.status).charAt(0).toUpperCase() + String(record.status).slice(1)}
                  </Pill>
                  {record._sync && <SyncChip sync={record._sync} showError={false} />}
                </span>
                <span className={styles.detail}>
                  {record.reason && (
                    <span className={styles.reason}>
                      {REASON_LABELS[record.reason] || record.reason}
                    </span>
                  )}
                  {record.notes && <span className={styles.notes}>{record.notes}</span>}
                  {record.marked_by_name && (
                    <span className={styles.by}>Recorded by {record.marked_by_name}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {records.length > visible && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setVisible((count) => count + PAGE_SIZE)}
            >
              Show more
            </button>
          )}
        </>
      )}
    </SectionShell>
  );
}
