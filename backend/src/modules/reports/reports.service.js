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
    `SELECT week_start_date, status, notes FROM attendance WHERE student_id = $1 ORDER BY week_start_date DESC`,
    [studentId]
  );
  const { rows: feedbackRows } = await db.query(
    `SELECT content, flagged_concern, created_at FROM feedback WHERE student_id = $1 ORDER BY created_at DESC`,
    [studentId]
  );
  const { rows: gradeRows } = await db.query(
    `SELECT grade_value, comments, updated_at FROM grades WHERE student_id = $1`,
    [studentId]
  );
  const { rows: submissionRows } = await db.query(
    `SELECT file_name, submitted_at, status FROM submissions WHERE student_id = $1 ORDER BY submitted_at DESC`,
    [studentId]
  );

  const grade = gradeRows[0] || {};
  const header = ['Student', 'Email', 'Status', 'Industry Supervisor', 'University Supervisor', 'Grade', 'Attendance', 'Submissions', 'Feedback'];
  const body = [
    student.name,
    student.email,
    student.link_status,
    student.industry_supervisor_id || '',
    student.university_supervisor_id || '',
    grade.grade_value || '',
    attendanceRows.length,
    submissionRows.length,
    feedbackRows.length,
  ];

  const lines = [
    header.map(toCsvValue).join(','),
    body.map(toCsvValue).join(','),
    '',
    'Attendance records',
    'week_start_date,status,notes',
    ...attendanceRows.map((row) => [row.week_start_date, row.status, row.notes || ''].map(toCsvValue).join(',')),
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
            (SELECT grade_value FROM grades g WHERE g.student_id = s.id ORDER BY g.updated_at DESC LIMIT 1) AS grade_value,
            (SELECT COUNT(*) FROM attendance a WHERE a.student_id = s.id) AS attendance_count,
            (SELECT COUNT(*) FROM submissions sub WHERE sub.student_id = s.id) AS submission_count,
            (SELECT COUNT(*) FROM feedback f WHERE f.student_id = s.id) AS feedback_count
     FROM students s
     ORDER BY s.name ASC`
  );

  const header = ['Student', 'Email', 'Link status', 'Location', 'Current grade', 'Attendance count', 'Submission count', 'Feedback count'];
  const body = rows.map((row) => [
    row.name,
    row.email,
    row.link_status,
    row.location || '',
    row.grade_value || '',
    row.attendance_count || 0,
    row.submission_count || 0,
    row.feedback_count || 0,
  ]);

  return [header.map(toCsvValue).join(','), ...body.map((row) => row.map(toCsvValue).join(','))].join('\n');
}

module.exports = { generateStudentCsv, generateCohortCsv };
