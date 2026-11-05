const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { parseWindow, assessStudent } = require('./attendance.monitor.rules');

const ALLOWED_ROLES = new Set(['industry_supervisor', 'university_supervisor', 'admin', 'hod']);

async function getOverview(user, requestedWindow) {
  if (!user || !ALLOWED_ROLES.has(user.role)) {
    throw new AppError('Not authorised to view attendance monitoring', 403);
  }
  const days = parseWindow(requestedWindow);
  const isIndustry = user.role === 'industry_supervisor';
  const isUniversity = user.role === 'university_supervisor';

  const sql = `
    SELECT s.id AS student_id,
           s.name AS student_name,
           s.programme,
           COALESCE(p.status::text, 'unallocated') AS placement_status,
           c.name AS company_name,
           to_char(last_record.last_date, 'YYYY-MM-DD') AS last_recorded,
           (CURRENT_DATE - last_record.last_date)::int AS days_since,
           COALESCE(totals.present_count, 0)::int AS present_count,
           COALESCE(totals.absent_count, 0)::int AS absent_count,
           COALESCE(totals.excused_count, 0)::int AS excused_count,
           COALESCE(totals.partial_count, 0)::int AS partial_count
    FROM students s
    LEFT JOIN placements p ON p.student_id = s.id
    LEFT JOIN companies c ON c.id = p.company_id
    LEFT JOIN LATERAL (
      SELECT MAX(a.attendance_date) AS last_date
      FROM attendance a WHERE a.student_id = s.id
    ) last_record ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) FILTER (WHERE a.status = 'present') AS present_count,
             COUNT(*) FILTER (WHERE a.status = 'absent') AS absent_count,
             COUNT(*) FILTER (WHERE a.status = 'excused') AS excused_count,
             COUNT(*) FILTER (WHERE a.status = 'partial') AS partial_count
      FROM attendance a
      WHERE a.student_id = s.id
        AND a.attendance_date BETWEEN CURRENT_DATE - ($1::int - 1) AND CURRENT_DATE
    ) totals ON true
    WHERE (
       $2::text = 'admin' OR $2::text = 'hod'
       OR ($2::text = 'industry_supervisor' AND EXISTS (
            SELECT 1 FROM industry_supervisors isp
            WHERE isp.id = s.industry_supervisor_id AND isp.user_id = $3::uuid
       ))
       OR ($2::text = 'university_supervisor' AND EXISTS (
            SELECT 1 FROM university_supervisors usp
            WHERE usp.id = s.university_supervisor_id AND usp.user_id = $3::uuid
       ))
    )
    ORDER BY s.name ASC, s.id ASC
  `;

  const { rows } = await db.query(sql, [days, user.role, user.id]);
  const students = rows.map((row) => assessStudent(row, days));
  const summary = {
    students: students.length,
    attention: students.filter((row) => row.level === 'attention').length,
    normal: students.filter((row) => row.level === 'normal').length,
    notStarted: students.filter((row) => row.level === 'not_started').length,
    recordedAbsences: students.reduce((total, row) => total + row.absent_count, 0),
  };
  return {
    windowDays: days,
    generatedAt: new Date().toISOString(),
    explanation: 'Only explicitly recorded absences count as absent. Missing records indicate incomplete reporting, not absence.',
    summary,
    students,
  };
}

module.exports = { getOverview };
