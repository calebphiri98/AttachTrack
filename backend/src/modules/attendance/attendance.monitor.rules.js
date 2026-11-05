const VALID_WINDOWS = Object.freeze([7, 14, 30]);

function parseWindow(value) {
  if (value === undefined || value === null || value === '') return 14;
  const number = Number(value);
  if (!Number.isInteger(number) || !VALID_WINDOWS.includes(number)) {
    const error = new Error('Window must be 7, 14 or 30 days');
    error.statusCode = 400;
    throw error;
  }
  return number;
}

function assessStudent(row, windowDays = 14) {
  const absent = Number(row.absent_count || 0);
  const present = Number(row.present_count || 0);
  const excused = Number(row.excused_count || 0);
  const partial = Number(row.partial_count || 0);
  const observed = present + absent + excused + partial;
  const daysSince = row.days_since === null || row.days_since === undefined
    ? null
    : Number(row.days_since);
  const confirmed = row.placement_status === 'confirmed';
  const reasons = [];
  if (confirmed && absent >= 3) reasons.push('Three or more recorded absences in the selected period');
  if (confirmed && (daysSince === null || daysSince >= 7)) {
    reasons.push(daysSince === null
      ? 'No attendance record has been entered yet'
      : 'No attendance record entered in the last seven calendar days');
  }
  const level = reasons.length ? 'attention' : confirmed ? 'normal' : 'not_started';
  return {
    ...row,
    present_count: present,
    absent_count: absent,
    excused_count: excused,
    partial_count: partial,
    recorded_days: observed,
    days_since: daysSince,
    window_days: windowDays,
    level,
    reasons,
  };
}

module.exports = { parseWindow, assessStudent };
