import { useEffect, useState } from 'react';
import { Card, EmptyState } from '../../../components/shared/Card';
import StatusBadge from '../../../components/shared/StatusBadge';
import StampButton from '../../../components/shared/StampButton';
import * as attendanceApi from '../../../api/attendance.api';

const STATUS_OPTIONS = ['present', 'absent', 'partial'];

export default function AttendanceSection({ studentId }) {
  const [records, setRecords] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ weekStartDate: '', status: 'present', notes: '' });
  const [saving, setSaving] = useState(false);

  function load() {
    attendanceApi
      .listAttendanceForStudent(studentId)
      .then((res) => setRecords(res.data))
      .catch((err) => setError(err.message));
  }

  useEffect(load, [studentId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.weekStartDate) {
      setError('Pick the week this attendance is for');
      return;
    }
    setSaving(true);
    try {
      await attendanceApi.markAttendance({ studentId, ...form });
      setForm({ weekStartDate: '', status: 'present', notes: '' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="section-title">Attendance</h2>

      <form onSubmit={handleSubmit} className="inline-form">
        <div className="inline-form__row">
          <label className="inline-form__field">
            <span>Week starting</span>
            <input
              type="date"
              value={form.weekStartDate}
              onChange={(e) => setForm({ ...form, weekStartDate: e.target.value })}
            />
          </label>
          <label className="inline-form__field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="inline-form__field inline-form__field--full">
          <span>Notes (optional)</span>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Anything worth noting this week"
          />
        </label>
        {error && <p className="inline-form__error">{error}</p>}
        <StampButton type="submit" loading={saving} style={{ width: 'auto', padding: '9px 20px' }}>
          Save attendance
        </StampButton>
      </form>

      <div className="section-divider" />

      {records === null && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
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
