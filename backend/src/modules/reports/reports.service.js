const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireUuid } = require('../../utils/validators');
const studentsService = require('../students/students.service');

function toCsvValue(value) {
  if (value === null || value === undefined) return '';
  const stringValue = String(value).replace(/"/g, '""');
  return `"${stringValue}"`;
}

async function generateStudentCsv(studentId, requester) {
  requireUuid(studentId, 'studentId');
  const student = await studentsService.getById(studentId);

  const isOwnRecord = requester.role === 'student' && student.user_id === requester.id;
  const isIndustrySupervisor =
    requester.role === 'industry_supervisor' && requester.supervisorId === student.industry_supervisor_id;
  const isUniversitySupervisor =
    requester.role === 'university_supervisor' && requester.supervisorId === student.university_supervisor_id;

  if (!isOwnRecord && !isIndustrySupervisor && !isUniversitySupervisor) {
    throw new AppError('You do not have access to this student report', 403);
  }

  const { rows: attendanceRows } = await db.query(
    `SELECT to_char(attendance_date, 'YYYY-MM-DD') AS attendance_date, status, reason, notes
     FROM attendance
     WHERE student_id = $1
     ORDER BY attendance_date DESC`,
    [studentId]
  );
  const { rows: feedbackRows } = await db.query(
    `SELECT content, flagged_concern, created_at FROM feedback WHERE student_id = $1 ORDER BY created_at DESC`,
    [studentId]
  );
  const { rows: resultRows } = await db.query(
    `SELECT final_percent FROM results WHERE student_id = $1 AND released_at IS NOT NULL`,
    [studentId]
  );
  const { rows: submissionRows } = await db.query(
    `SELECT file_name, submitted_at, status FROM submissions WHERE student_id = $1 ORDER BY submitted_at DESC`,
    [studentId]
  );

  const finalResult = resultRows[0] ? resultRows[0].final_percent : '';
  const header = ['Student', 'Email', 'Status', 'Industry Supervisor', 'University Supervisor', 'Final result (%)', 'Attendance days recorded', 'Submissions', 'Feedback'];
  const body = [
    student.name,
    student.email,
    student.link_status,
    student.industry_supervisor_id || '',
    student.university_supervisor_id || '',
    finalResult,
    attendanceRows.length,
    submissionRows.length,
    feedbackRows.length,
  ];

  const lines = [
    header.map(toCsvValue).join(','),
    body.map(toCsvValue).join(','),
    '',
    'Attendance records',
    'attendance_date,status,reason,notes',
    ...attendanceRows.map((row) =>
      [row.attendance_date, row.status, row.reason || '', row.notes || ''].map(toCsvValue).join(',')
    ),
    '',
    'Submissions',
    'file_name,submitted_at,status',
    ...submissionRows.map((row) => [row.file_name, row.submitted_at, row.status].map(toCsvValue).join(',')),
    '',
    'Feedback',
    'content,flagged_concern,created_at',
    ...feedbackRows.map((row) => [row.content, row.flagged_concern, row.created_at].map(toCsvValue).join(',')),
  ];

  return lines.join('\n');
}

async function generateCohortCsv(requester) {
  if (requester.role !== 'admin') {
    throw new AppError('Only administrators can export the cohort report', 403);
  }

  const { rows } = await db.query(
    `SELECT s.name,
            s.email,
            s.link_status,
            s.location,
            (SELECT r.final_percent FROM results r WHERE r.student_id = s.id) AS final_percent,
            (SELECT CASE
                      WHEN r.released_at IS NOT NULL THEN 'released'
                      WHEN r.status = 'approved' THEN 'approved'
                      ELSE 'compiled'
                    END
             FROM results r
             WHERE r.student_id = s.id) AS result_status,
            (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id) AS attendance_count,
            (SELECT COUNT(*) FROM submissions sub WHERE sub.student_id = s.id) AS submission_count,
            (SELECT COUNT(*) FROM feedback f WHERE f.student_id = s.id) AS feedback_count
     FROM students s
     ORDER BY s.name ASC`
  );

  const header = ['Student', 'Email', 'Link status', 'Location', 'Final result (%)', 'Result status', 'Attendance days recorded', 'Submission count', 'Feedback count'];
  const body = rows.map((row) => [
    row.name,
    row.email,
    row.link_status,
    row.location || '',
    row.final_percent === null || row.final_percent === undefined ? '' : row.final_percent,
    row.result_status || '',
    row.attendance_count || 0,
    row.submission_count || 0,
    row.feedback_count || 0,
  ]);

  return [header.map(toCsvValue).join(','), ...body.map((row) => row.map(toCsvValue).join(','))].join('\n');
}

module.exports = { generateStudentCsv, generateCohortCsv };