const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireUuid } = require('../../utils/validators');

async function listStudents() {
  const { rows } = await db.query(
    `SELECT s.id,
            s.name,
            s.email,
            s.link_status,
            s.location,
            s.created_at,
            i.id AS industry_supervisor_id,
            i.company_name AS industry_company_name,
            u.id AS university_supervisor_id,
            u.department AS university_department,
            (SELECT g.grade_value
             FROM grades g
             WHERE g.student_id = s.id
             ORDER BY g.updated_at DESC
             LIMIT 1) AS current_grade,
            (SELECT COUNT(*)
             FROM attendance a
             WHERE a.student_id = s.id) AS attendance_count,
            (SELECT COUNT(*)
             FROM submissions sub
             WHERE sub.student_id = s.id) AS submission_count,
            (SELECT COUNT(*)
             FROM feedback f
             WHERE f.student_id = s.id) AS feedback_count
     FROM students s
     LEFT JOIN industry_supervisors i ON i.id = s.industry_supervisor_id
     LEFT JOIN university_supervisors u ON u.id = s.university_supervisor_id
     ORDER BY s.created_at DESC`
  );

  return rows;
}

async function getDashboard() {
  const students = await listStudents();

  const totalStudents = students.length;
  const linkedStudents = students.filter((student) => student.link_status === 'linked').length;
  const withIndustry = students.filter((student) => student.industry_supervisor_id).length;
  const withUniversity = students.filter((student) => student.university_supervisor_id).length;

  const gradeValues = students
    .map((student) => Number(student.current_grade))
    .filter((value) => Number.isFinite(value));
  const avgGrade = gradeValues.length
    ? gradeValues.reduce((sum, value) => sum + value, 0) / gradeValues.length
    : 0;

  return {
    summary: {
      totalStudents,
      linkedStudents,
      withIndustry,
      withUniversity,
      averageGrade: Number(avgGrade.toFixed(2)),
    },
    students,
  };
}

async function assignStudentSupervisors({ studentId, industrySupervisorId, universitySupervisorId }) {
  requireUuid(studentId, 'studentId');

  if (!industrySupervisorId && !universitySupervisorId) {
    throw new AppError('Provide at least one supervisor assignment', 400);
  }

  if (industrySupervisorId) {
    requireUuid(industrySupervisorId, 'industrySupervisorId');
    const { rows } = await db.query('SELECT id FROM industry_supervisors WHERE id = $1', [industrySupervisorId]);
    if (!rows[0]) throw new AppError('Industry supervisor not found', 404);
  }

  if (universitySupervisorId) {
    requireUuid(universitySupervisorId, 'universitySupervisorId');
    const { rows } = await db.query('SELECT id FROM university_supervisors WHERE id = $1', [universitySupervisorId]);
    if (!rows[0]) throw new AppError('University supervisor not found', 404);
  }

  const { rows } = await db.query(
    `UPDATE students
     SET industry_supervisor_id = $1,
         university_supervisor_id = $2,
         link_status = CASE
           WHEN user_id IS NOT NULL AND ($1 IS NOT NULL OR $2 IS NOT NULL) THEN 'linked'
           ELSE 'unlinked'
         END,
         updated_at = now()
     WHERE id = $3
     RETURNING *`,
    [industrySupervisorId || null, universitySupervisorId || null, studentId]
  );

  if (!rows[0]) throw new AppError('Student not found', 404);
  return rows[0];
}

module.exports = { listStudents, getDashboard, assignStudentSupervisors };
