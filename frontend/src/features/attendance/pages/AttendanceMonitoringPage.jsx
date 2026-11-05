import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../../components/shared/PortalLayout';
import { useAuth } from '../../../context/AuthContext';
import { getAttendanceMonitor } from '../../../api/attendanceMonitor.api';
import styles from './AttendanceMonitoringPage.module.css';

const FILTERS = [
  { value: 'all', label: 'All students' },
  { value: 'attention', label: 'Needs attention' },
  { value: 'normal', label: 'Up to date' },
  { value: 'not_started', label: 'Placement not confirmed' },
];

function statusLabel(level) {
  if (level === 'attention') return 'Needs attention';
  if (level === 'normal') return 'Up to date';
  return 'Not confirmed';
}

export default function AttendanceMonitoringPage() {
  const { user } = useAuth();
  const [days, setDays] = useState(14);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    getAttendanceMonitor(days)
      .then((result) => { if (alive) setData(result.data); })
      .catch((err) => { if (alive) { setError(err.message || 'Could not load attendance monitoring'); setData(null); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [days, revision]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data?.students || []).filter((row) => {
      if (filter !== 'all' && row.level !== filter) return false;
      return !needle || [row.student_name, row.programme, row.company_name].some((v) => String(v || '').toLowerCase().includes(needle));
    });
  }, [data, search, filter]);

  const isIndustry = user?.role === 'industry_supervisor';

  return (
    <PortalLayout eyebrow="Attendance" title="Attendance monitoring">
      <div className={styles.shell}>
        <div className={styles.header}>
          <div>
            <h2>Monitoring overview</h2>
            <p>Review recorded attendance and identify students who may need follow-up.</p>
          </div>
          <div className={styles.tools}>
            <label htmlFor="attendance-monitor-window">Period</label>
            <select id="attendance-monitor-window" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <button type="button" onClick={() => setRevision((v) => v + 1)} disabled={loading}>Refresh</button>
          </div>
        </div>
        <p className={styles.note}>Only attendance explicitly marked <strong>Absent</strong> counts as an absence. Missing records are reporting gaps, not evidence of absence. Alerts are indicators for review, not disciplinary decisions.</p>
        {error && <div className={styles.error} role="alert">{error} <button type="button" onClick={() => setRevision((v) => v + 1)}>Retry</button></div>}
        {loading && <p role="status">Loading attendance overview...</p>}
        {!loading && data && (
          <>
            <div className={styles.stats} aria-label="Attendance monitoring summary">
              <div><span>Students</span><strong>{data.summary.students}</strong></div>
              <div><span>Needs attention</span><strong>{data.summary.attention}</strong></div>
              <div><span>Up to date</span><strong>{data.summary.normal}</strong></div>
              <div><span>Not confirmed</span><strong>{data.summary.notStarted}</strong></div>
              <div><span>Recorded absences</span><strong>{data.summary.recordedAbsences}</strong></div>
            </div>
            <div className={styles.filters}>
              <label>
                Search student or organisation
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students" />
              </label>
              <label>
                Display
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                  {FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <span>{visible.length} of {data.students.length} students</span>
            </div>
            {visible.length === 0 ? <p>No students match the selected filters.</p> : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Student</th><th>Placement</th><th>Last recorded</th><th>Present</th><th>Absent</th><th>Excused</th><th>Partial</th><th>Monitoring</th><th>Action</th></tr></thead>
                  <tbody>
                    {visible.map((row) => (
                      <tr key={row.student_id}>
                        <td data-label="Student"><strong>{row.student_name}</strong><small>{row.programme || ''}</small></td>
                        <td data-label="Placement">{row.company_name || row.placement_status}</td>
                        <td data-label="Last recorded">{row.last_recorded || 'Never recorded'}</td>
                        <td data-label="Present">{row.present_count}</td>
                        <td data-label="Absent">{row.absent_count}</td>
                        <td data-label="Excused">{row.excused_count}</td>
                        <td data-label="Partial">{row.partial_count}</td>
                        <td data-label="Monitoring">
                          <span className={`${styles.level} ${styles[row.level]}`}>{statusLabel(row.level)}</span>
                          {row.reasons.map((reason) => <small key={reason}>{reason}</small>)}
                        </td>
                        <td data-label="Action">
                          {isIndustry ? <Link to={`/industry/attendance?student=${encodeURIComponent(row.student_id)}`}>Review attendance</Link> : <span>Read-only overview</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className={styles.footer}>Period: last {data.windowDays} calendar days. Counts are records, not a calculated attendance percentage. No attendance record is automatically created or changed by this page.</p>
          </>
        )}
      </div>
    </PortalLayout>
  );
}
