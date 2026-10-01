import { useEffect, useState } from 'react';
import * as attendanceApi from '../../../api/attendance.api';
import styles from './AttendanceSection.module.css';

const STATUS_OPTIONS = ['present', 'absent', 'partial'];

const BADGE_CLASS = {
  present: styles.badgePresent,
  absent: styles.badgeAbsent,
  partial: styles.badgePartial,
};

const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);

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
    <section className={styles.card}>
      <h2 className={styles.title}>Attendance</h2>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Week starting</span>
            <input
              className={styles.input}
              type="date"
              value={form.weekStartDate}
              onChange={(e) => setForm({ ...form, weekStartDate: e.target.value })}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Status</span>
            <select
              className={styles.select}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {capitalize(s)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Notes (optional)</span>
          <input
            className={styles.input}
            type="text"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Anything worth noting this week"
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button type="submit" className={styles.button} disabled={saving}>
            {saving && <span className={styles.spinner} aria-hidden="true" />}
            Save attendance
          </button>
        </div>
      </form>

      <hr className={styles.divider} />

      {records === null && <p className={styles.loading}>Loading…</p>}

      {records && records.length === 0 && (
        <p className={styles.empty}>No attendance marked yet.</p>
      )}

      {records && records.length > 0 && (
        <ul className={styles.list}>
          {records.map((r) => (
            <li key={r.id} className={styles.record}>
              <span className={styles.date}>
                {new Date(r.week_start_date).toLocaleDateString()}
              </span>
              <span className={`${styles.badge} ${BADGE_CLASS[r.status] || styles.badgeOther}`}>
                {r.status}
              </span>
              {r.notes && <span className={styles.notes}>{r.notes}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}