const db = require('../../config/db');
const AppError = require('../../utils/AppError');

// A student row is considered "linked" once someone has actually verified an
// account for it (user_id set) AND at least one supervisor has claimed them.
// Both halves matter — an added-but-unregistered student, or a registered
// student nobody has added yet, are both still "unlinked" in the sense the
// spec cares about (they can't submit/message/receive feedback yet).
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

// Finds a student row by email, or creates a bare placeholder one if none
// exists yet (used when a supervisor adds a student who hasn't signed up).
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

// Called by a supervisor's "add student" endpoint.
// supervisorColumn is either 'industry_supervisor_id' or 'university_supervisor_id'.
async function assignSupervisor({ email, name, supervisorColumn, supervisorId }) {
  assertValidSupervisorColumn(supervisorColumn);
  const student = await findOrCreateByEmail(email, name);

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

// Called during student signup — matches a newly verified user to any
// student record a supervisor may have already created for that email.
async function attachUserAccount({ email, name, userId }) {
  const student = await findOrCreateByEmail(email, name);

  if (student.user_id && student.user_id !== userId) {
    // Shouldn't happen in practice (email is unique in `users`), but guard anyway.
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
  const { rows } = await db.query('SELECT * FROM students WHERE id = $1', [studentId]);
  const student = rows[0];
  if (!student) {
    throw new AppError('Student not found', 404);
  }
  return student;
}

// Confirms the given supervisor actually supervises this student before
// letting them read/write attendance, feedback, or grades for that student.
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
