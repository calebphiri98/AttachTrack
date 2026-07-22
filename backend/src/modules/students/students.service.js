const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireEmail, requireString, requireUuid } = require('../../utils/validators');

function computeLinkStatus(row) {
  const hasAccount = !!row.user_id;
  const hasSupervisor = !!row.industry_supervisor_id || !!row.university_supervisor_id;
  return hasAccount && hasSupervisor ? 'linked' : 'unlinked';
}

async function recomputeAndSave(studentId) {
  const { rows } = await db.query('SELECT * FROM students WHERE id = $1', [studentId]);
  const student = rows[0];
  if (!student) return null;

  const newStatus = computeLinkStatus(student);
  if (newStatus !== student.link_status) {
    await db.query('UPDATE students SET link_status = $1 WHERE id = $2', [newStatus, studentId]);
  }
  return { ...student, link_status: newStatus };
}

async function findOrCreateByEmail(email, name) {
  const { rows } = await db.query('SELECT * FROM students WHERE email = $1', [email]);
  if (rows[0]) return rows[0];

  const { rows: inserted } = await db.query(
    `INSERT INTO students (name, email, link_status)
     VALUES ($1, $2, 'unlinked')
     RETURNING *`,
    [name, email]
  );
  return inserted[0];
}

const VALID_SUPERVISOR_COLUMNS = ['industry_supervisor_id', 'university_supervisor_id'];

function assertValidSupervisorColumn(column) {
  if (!VALID_SUPERVISOR_COLUMNS.includes(column)) {
    throw new AppError('Invalid supervisor column', 500);
  }
}

async function assignSupervisor({ email, name, supervisorColumn, supervisorId }) {
  assertValidSupervisorColumn(supervisorColumn);
  const cleanEmail = requireEmail(email);
  const cleanName = requireString(name, 'name', { min: 1, max: 150 });

  const student = await findOrCreateByEmail(cleanEmail, cleanName);

  const currentValue = student[supervisorColumn];
  if (currentValue && currentValue !== supervisorId) {
    throw new AppError(
      'This student is already assigned to a different supervisor of that type',
      409
    );
  }

  if (currentValue !== supervisorId) {
    await db.query(`UPDATE students SET ${supervisorColumn} = $1 WHERE id = $2`, [
      supervisorId,
      student.id,
    ]);
  }

  return recomputeAndSave(student.id);
}

async function attachUserAccount({ email, name, userId }) {
  const cleanEmail = requireEmail(email);
  const cleanName = requireString(name, 'name', { min: 1, max: 150 });

  const student = await findOrCreateByEmail(cleanEmail, cleanName);

  if (student.user_id && student.user_id !== userId) {
    throw new AppError('This student email is already linked to a different account', 409);
  }

  if (!student.user_id) {
    await db.query('UPDATE students SET user_id = $1 WHERE id = $2', [userId, student.id]);
  }

  return recomputeAndSave(student.id);
}

async function listBySupervisor(supervisorColumn, supervisorId) {
  assertValidSupervisorColumn(supervisorColumn);
  const { rows } = await db.query(
    `SELECT id, name, email, link_status, created_at
     FROM students
     WHERE ${supervisorColumn} = $1
     ORDER BY created_at DESC`,
    [supervisorId]
  );
  return rows;
}

async function getProfileByUserId(userId) {
  const { rows } = await db.query(
    `SELECT s.id, s.name, s.email, s.link_status,
            iSup.company_name AS industry_supervisor_company,
            uSup.department AS university_supervisor_department
     FROM students s
     LEFT JOIN industry_supervisors iSup ON iSup.id = s.industry_supervisor_id
     LEFT JOIN university_supervisors uSup ON uSup.id = s.university_supervisor_id
     WHERE s.user_id = $1`,
    [userId]
  );

  const student = rows[0];
  if (!student) {
    throw new AppError('Student profile not found', 404);
  }
  return student;
}

async function getByUserId(userId) {
  const { rows } = await db.query('SELECT * FROM students WHERE user_id = $1', [userId]);
  const student = rows[0];
  if (!student) {
    throw new AppError('Student profile not found', 404);
  }
  return student;
}

async function getById(studentId) {
  requireUuid(studentId, 'studentId');
  const { rows } = await db.query('SELECT * FROM students WHERE id = $1', [studentId]);
  const student = rows[0];
  if (!student) {
    throw new AppError('Student not found', 404);
  }
  return student;
}

async function assertSupervises(studentId, supervisorColumn, supervisorId) {
  assertValidSupervisorColumn(supervisorColumn);
  const student = await getById(studentId);
  if (student[supervisorColumn] !== supervisorId) {
    throw new AppError('You do not supervise this student', 403);
  }
  return student;
}

module.exports = {
  assignSupervisor,
  attachUserAccount,
  listBySupervisor,
  getProfileByUserId,
  getByUserId,
  getById,
  assertSupervises,
};