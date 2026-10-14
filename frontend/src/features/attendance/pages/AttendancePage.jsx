import { useEffect, useRef, useState } from 'react';
import PortalLayout from '../../../components/shared/PortalLayout';
import * as attendanceApi from '../../../api/attendanceLog.api';
import '../../../styles/portalSections.css';
import '../../assessments/pages/AssessmentPages.css';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'excused', label: 'Excused' },
  { value: 'partial', label: 'Partial (late or half day)' },
];

const REASON_OPTIONS = [
  { value: 'sick', label: 'Sick' },
  { value: 'transport', label: 'Transport' },
  { value: 'permission', label: 'Permission granted' },
  { value: 'other', label: 'Other' },
];

const STATUS_LABELS = {
  present: 'Present',
  absent: 'Absent',
  excused: 'Excused',
  partial: 'Partial',
};

const STATUS_CHIPS = {
  present: 'submitted',
  partial: 'draft',
  absent: 'inactive',
  excused: 'none',
};

const REASON_LABELS = {
  sick: 'Sick',
  transport: 'Transport',
  permission: 'Permission granted',
  other: 'Other',
};

const REASON_STATUSES = ['absent', 'excused'];
const MAX_RANGE_DAYS = 31;

function todayString() {
  return new Date().toLocaleDateString('en-CA');
}

function toTime(value) {
  return Date.parse(`${value}T00:00:00Z`);
}

function daysBetween(from, to) {
  return Math.round((toTime(to) - toTime(from)) / 86400000);
}

function formatDay(value) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function lastRecordedText(student) {
  if (!student.last_recorded) return 'Never recorded';
  if (student.days_since <= 0) return 'Today';
  return `${student.days_since} day${student.days_since === 1 ? '' : 's'} ago`;
}

function buildEmptyForm() {
  const today = todayString();
  return {
    dateFrom: today,
    dateTo: today,
    status: 'present',
    reason: '',
    notes: '',
    weekdaysOnly: true,
  };
}

export default function AttendancePage() {
  const [students, setStudents] = useState([]);
  const [settings, setSettings] = useState({ correctionDays: 7, backfillDays: 31, reminderDays: 7 });
  const [selectedId, setSelectedId] = useState('');
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(buildEmptyForm);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const formRef = useRef(null);

  async function loadStudents() {
    try {
      const res = await attendanceApi.listMyAttendanceStudents();
      setStudents(res.data.students);
      setSettings(res.data.settings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecords(studentId) {
    if (!studentId) {
      setRecords([]);
      return;
    }
    setRecordsLoading(true);
    try {
      const res = await attendanceApi.getStudentAttendance(studentId);
      setRecords(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setRecordsLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    loadRecords(selectedId);
  }, [selectedId]);

  const selectedStudent = students.find((student) => student.student_id === selectedId);
  const needsReason = REASON_STATUSES.includes(form.status);
  const isRange = form.dateFrom !== form.dateTo;
  const today = todayString();

  function scrollToForm() {
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  function handleMark(studentId) {
    setSelectedId(studentId);
    setForm(buildEmptyForm());
    setError('');
    setMessage('');
    scrollToForm();
  }

  function handleStudentChange(studentId) {
    setSelectedId(studentId);
    setError('');
    setMessage('');
  }

  function updateForm(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'dateFrom' && next.dateTo < value) next.dateTo = value;
      if (field === 'status' && !REASON_STATUSES.includes(value)) next.reason = '';
      return next;
    });
  }

  function handleEdit(record) {
    setForm({
      dateFrom: record.attendance_date,
      dateTo: record.attendance_date,
      status: record.status,
      reason: record.reason || '',
      notes: record.notes || '',
      weekdaysOnly: false,
    });
    setError('');
    setMessage('');
    scrollToForm();
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!selectedId) {
      setError('Choose a student');
      return;
    }
    if (!form.dateFrom || !form.dateTo) {
      setError('Choose the dates');
      return;
    }

    const span = daysBetween(form.dateFrom, form.dateTo);
    if (span < 0) {
      setError('The end date cannot be before the start date');
      return;
    }
    if (span + 1 > MAX_RANGE_DAYS) {
      setError(`A range can cover at most ${MAX_RANGE_DAYS} days`);
      return;
    }
    if (form.dateTo > today) {
      setError('Attendance cannot be recorded for future dates');
      return;
    }
    if (needsReason && !form.reason) {
      setError('Choose a reason for an absent or excused day');
      return;
    }

    setSaving(true);
    try {
      const res = await attendanceApi.saveAttendance({
        studentId: selectedId,
        dateFrom: form.dateFrom,
        dateTo: form.dateTo,
        status: form.status,
        reason: needsReason ? form.reason : null,
        notes: form.notes,
        weekdaysOnly: form.weekdaysOnly,
      });
      const data = res.data;
      setMessage(`${data.created} added, ${data.updated} updated, ${data.unchanged} unchanged.`);
      await Promise.all([loadStudents(), loadRecords(selectedId)]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function overviewChip(student) {
    if (!student.last_recorded) return 'inactive';
    if (student.days_since >= settings.reminderDays) return 'draft';
    return 'submitted';
  }

  return (
    <PortalLayout eyebrow="Industrial supervisor" title="Attendance">
      {error && <p className="assess-error">{error}</p>}
      {message && <p className="assess-banner assess-banner--ok">{message}</p>}
      {loading && <p className="assess-empty">Loading students...</p>}

      {!loading && students.length === 0 && !error && (
        <p className="assess-empty">No students are assigned to you yet.</p>
      )}

      {students.length > 0 && (
        <>
          <div className="assess-card">
            <h2 className="assess-card__title">Your students</h2>
            <p className="assess-card__hint">
              Record attendance whenever suits you, one day at a time or several days at once. You
              get a reminder only when a student has had nothing recorded for {settings.reminderDays}{' '}
              days.
            </p>

            <div className="assess-table-wrap">
              <table className="assess-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Last recorded</th>
                    <th>Totals</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.student_id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{student.name}</div>
                        <div className="assess-table__muted">{student.programme || '-'}</div>
                      </td>
                      <td>
                        <span className={`assess-chip assess-chip--${overviewChip(student)}`}>
                          {lastRecordedText(student)}
                        </span>
                      </td>
                      <td className="assess-table__muted">
                        {student.present_count} present, {student.absent_count} absent,{' '}
                        {student.excused_count} excused, {student.partial_count} partial
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={() => handleMark(student.student_id)}
                        >
                          Record
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selectedId && (
            <form ref={formRef} className="assess-card" onSubmit={handleSave}>
              <h2 className="assess-card__title">Record attendance</h2>
              <p className="assess-card__hint">
                Pick one day, or a range to record several days at once. Existing days can be
                corrected for {settings.correctionDays} days, and missing days can be added up to{' '}
                {settings.backfillDays} days back.
              </p>

              <div className="assess-grid">
                <label className="assess-field">
                  <span>Student</span>
                  <select value={selectedId} onChange={(e) => handleStudentChange(e.target.value)}>
                    {students.map((student) => (
                      <option key={student.student_id} value={student.student_id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="assess-field">
                  <span>From</span>
                  <input
                    type="date"
                    value={form.dateFrom}
                    max={today}
                    onChange={(e) => updateForm('dateFrom', e.target.value)}
                    required
                  />
                </label>

                <label className="assess-field">
                  <span>To</span>
                  <input
                    type="date"
                    value={form.dateTo}
                    min={form.dateFrom}
                    max={today}
                    onChange={(e) => updateForm('dateTo', e.target.value)}
                    required
                  />
                </label>

                <label className="assess-field">
                  <span>Status</span>
                  <select value={form.status} onChange={(e) => updateForm('status', e.target.value)}>
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {needsReason && (
                  <label className="assess-field">
                    <span>Reason</span>
                    <select value={form.reason} onChange={(e) => updateForm('reason', e.target.value)}>
                      <option value="">Choose a reason</option>
                      {REASON_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="assess-field" style={{ gridColumn: '1 / -1' }}>
                  <span>Note (optional)</span>
                  <input
                    value={form.notes}
                    maxLength={2000}
                    onChange={(e) => updateForm('notes', e.target.value)}
                  />
                </label>
              </div>

              {isRange && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 16,
                    fontSize: '0.9rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.weekdaysOnly}
                    onChange={(e) => updateForm('weekdaysOnly', e.target.checked)}
                  />
                  Weekdays only (skip Saturdays and Sundays)
                </label>
              )}

              <div className="assess-actions">
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save attendance'}
                </button>
              </div>
            </form>
          )}

          {selectedId && (
            <div className="assess-card">
              <h2 className="assess-card__title">
                Recent records{selectedStudent ? `: ${selectedStudent.name}` : ''}
              </h2>

              {recordsLoading && <p className="assess-empty">Loading records...</p>}
              {!recordsLoading && records.length === 0 && (
                <p className="assess-empty">Nothing has been recorded for this student yet.</p>
              )}

              {records.length > 0 && (
                <div className="assess-table-wrap">
                  <table className="assess-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Reason</th>
                        <th>Note</th>
                        <th>Recorded by</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record) => {
                        const canEdit =
                          daysBetween(record.attendance_date, today) <= settings.correctionDays;
                        return (
                          <tr key={record.id}>
                            <td>{formatDay(record.attendance_date)}</td>
                            <td>
                              <span className={`assess-chip assess-chip--${STATUS_CHIPS[record.status]}`}>
                                {STATUS_LABELS[record.status]}
                              </span>
                            </td>
                            <td>{record.reason ? REASON_LABELS[record.reason] : '-'}</td>
                            <td className="assess-table__muted">{record.notes || '-'}</td>
                            <td className="assess-table__muted">{record.marked_by_name || '-'}</td>
                            <td>
                              {canEdit ? (
                                <button
                                  type="button"
                                  className="btn btn--ghost"
                                  onClick={() => handleEdit(record)}
                                >
                                  Correct
                                </button>
                              ) : (
                                <span className="assess-table__muted">Locked</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </PortalLayout>
  );
}