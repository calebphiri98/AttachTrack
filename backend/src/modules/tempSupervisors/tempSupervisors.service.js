const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireUuid, optionalString } = require('../../utils/validators');
const studentsService = require('../students/students.service');
const universitySupervisorsService = require('../universitySupervisors/universitySupervisors.service');

// Confirms the requesting university supervisor actually supervises this
// student (their permanent university_supervisor_id must match), and
// returns both records for the caller to use. Mirrors the same check used
// in siteVisits.service.js.
async function assertSupervises(userId, studentId) {
  requireUuid(studentId, 'studentId');
  const universitySupervisor = await universitySupervisorsService.getSupervisorRecordByUserId(userId);
  const student = await studentsService.getById(studentId);

  if (student.university_supervisor_id !== universitySupervisor.id) {
    throw new AppError('You do not supervise this student', 403);
  }

  return { student, universitySupervisor };
}

// Same access rule as siteVisits.service.js: the student themself, or the
// university supervisor who supervises them.
async function assertCanView(studentId, requester) {
  const student = await studentsService.getById(studentId);

  const isOwnRecord = requester.role === 'student' && student.user_id === requester.id;
  const isUniversitySupervisor =
    requester.role === 'university_supervisor' &&
    requester.supervisorId === student.university_supervisor_id;

  if (!isOwnRecord && !isUniversitySupervisor) {
    throw new AppError('You do not have access to this student\'s supervisor assignments', 403);
  }

  return student;
}

// The currently active temp assignment for a student, or null. "Active"
// means end_date IS NULL, matching the partial index on the table.
async function getCurrent(studentId, requester) {
  requireUuid(studentId, 'studentId');
  await assertCanView(studentId, requester);
  const { rows } = await db.query(
    `SELECT tsa.*, i.company_name AS industry_supervisor_company, u.name AS assigned_by_name
     FROM temp_supervisor_assignments tsa
     JOIN industry_supervisors i ON i.id = tsa.industry_supervisor_id
     JOIN university_supervisors us ON us.id = tsa.assigned_by_university_id
     JOIN users u ON u.id = us.user_id
     WHERE tsa.student_id = $1 AND tsa.end_date IS NULL`,
    [studentId]
  );
  return rows[0] || null;
}

async function listHistory(studentId, requester) {
  requireUuid(studentId, 'studentId');
  await assertCanView(studentId, requester);
  const { rows } = await db.query(
    `SELECT tsa.*, i.company_name AS industry_supervisor_company
     FROM temp_supervisor_assignments tsa
     JOIN industry_supervisors i ON i.id = tsa.industry_supervisor_id
     WHERE tsa.student_id = $1
     ORDER BY tsa.start_date DESC, tsa.created_at DESC`,
    [studentId]
  );
  return rows;
}

// Assigns (or reassigns) a temp industry supervisor for a student. If one
// is already active, it's closed (end_date = now) in the same transaction
// as the new row is inserted, so there's never a moment with two active
// rows or a gap with none during the swap.
async function assign({ userId, studentId, industrySupervisorId, department }) {
  requireUuid(industrySupervisorId, 'industrySupervisorId');
  const cleanDepartment = optionalString(department, { max: 200 });

  const { student, universitySupervisor } = await assertSupervises(userId, studentId);

  const { rows: industryRows } = await db.query('SELECT id FROM industry_supervisors WHERE id = $1', [
    industrySupervisorId,
  ]);
  if (!industryRows[0]) {
    throw new AppError('Industry supervisor not found', 404);
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE temp_supervisor_assignments
       SET end_date = CURRENT_DATE
       WHERE student_id = $1 AND end_date IS NULL`,
      [student.id]
    );

    const { rows } = await client.query(
      `INSERT INTO temp_supervisor_assignments
         (student_id, industry_supervisor_id, assigned_by_university_id, department)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [student.id, industrySupervisorId, universitySupervisor.id, cleanDepartment]
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Ends the active temp assignment without starting a new one — the student
// reverts to being supervised by their permanent industry supervisor.
async function end({ userId, studentId }) {
  const { student } = await assertSupervises(userId, studentId);

  const { rows } = await db.query(
    `UPDATE temp_supervisor_assignments
     SET end_date = CURRENT_DATE
     WHERE student_id = $1 AND end_date IS NULL
     RETURNING *`,
    [student.id]
  );

  if (!rows[0]) {
    throw new AppError('This student has no active temporary supervisor', 404);
  }

  return rows[0];
}

module.exports = { getCurrent, listHistory, assign, end };
