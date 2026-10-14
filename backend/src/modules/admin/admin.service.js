const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const {
  requireUuid,
  requireString,
  requireEmail,
} = require('../../utils/validators');
const { sendAccountCreatedEmail } = require('../../config/mailer');

const SALT_ROUNDS = 10;

const TEMP_PASSWORD_ALPHABET =
  'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

const CREATABLE_ROLES = [
  'industry_supervisor',
  'university_supervisor',
  'hod',
];

async function listStudents() {
  const { rows } = await db.query(
    `SELECT s.id,
            s.name,
            s.email,
            s.link_status,
            s.location,
            s.created_at,
            i.id AS industry_supervisor_id,
            iu.name AS industry_supervisor_name,
            i.company_name AS industry_company_name,
            u.id AS university_supervisor_id,
            uu.name AS university_supervisor_name,
            u.department AS university_department,
            (SELECT r.final_percent
             FROM results r
             WHERE r.student_id = s.id) AS current_grade,
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
     LEFT JOIN industry_supervisors i
       ON i.id = s.industry_supervisor_id
     LEFT JOIN users iu
       ON iu.id = i.user_id
     LEFT JOIN university_supervisors u
       ON u.id = s.university_supervisor_id
     LEFT JOIN users uu
       ON uu.id = u.user_id
     ORDER BY s.created_at DESC`
  );

  return rows;
}

async function getDashboard() {
  const students = await listStudents();

  const totalStudents = students.length;

  const linkedStudents = students.filter(
    (student) => student.link_status === 'linked'
  ).length;

  const withIndustry = students.filter(
    (student) => student.industry_supervisor_id
  ).length;

  const withUniversity = students.filter(
    (student) => student.university_supervisor_id
  ).length;

  const gradeValues = students
    .map((student) => Number(student.current_grade))
    .filter((value) => Number.isFinite(value));

  const avgGrade = gradeValues.length
    ? gradeValues.reduce((sum, value) => sum + value, 0) /
      gradeValues.length
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

async function listSupervisors() {
  const { rows: industry } = await db.query(
    `SELECT i.id,
            u.name,
            u.email,
            u.is_active,
            COALESCE(c.name, i.company_name) AS organisation
     FROM industry_supervisors i
     JOIN users u ON u.id = i.user_id
     LEFT JOIN companies c ON c.id = i.company_id
     ORDER BY u.name`
  );

  const { rows: university } = await db.query(
    `SELECT s.id,
            u.name,
            u.email,
            u.is_active,
            s.department
     FROM university_supervisors s
     JOIN users u ON u.id = s.user_id
     ORDER BY u.name`
  );

  return { industry, university };
}

async function assignStudentSupervisors({
  studentId,
  industrySupervisorId,
  universitySupervisorId,
}) {
  requireUuid(studentId, 'studentId');

  if (!industrySupervisorId && !universitySupervisorId) {
    throw new AppError(
      'Provide at least one supervisor assignment',
      400
    );
  }

  if (industrySupervisorId) {
    requireUuid(
      industrySupervisorId,
      'industrySupervisorId'
    );

    const { rows } = await db.query(
      'SELECT id FROM industry_supervisors WHERE id = $1',
      [industrySupervisorId]
    );

    if (!rows[0]) {
      throw new AppError(
        'Industry supervisor not found',
        404
      );
    }
  }

  if (universitySupervisorId) {
    requireUuid(
      universitySupervisorId,
      'universitySupervisorId'
    );

    const { rows } = await db.query(
      'SELECT id FROM university_supervisors WHERE id = $1',
      [universitySupervisorId]
    );

    if (!rows[0]) {
      throw new AppError(
        'University supervisor not found',
        404
      );
    }
  }

  const { rows } = await db.query(
    `UPDATE students
     SET industry_supervisor_id = $1::uuid,
         university_supervisor_id = $2::uuid,
         link_status = (CASE
           WHEN user_id IS NOT NULL
                AND ($1::uuid IS NOT NULL OR $2::uuid IS NOT NULL)
           THEN 'linked'
           ELSE 'unlinked'
         END)::link_status,
         updated_at = now()
     WHERE id = $3::uuid
     RETURNING *`,
    [
      industrySupervisorId || null,
      universitySupervisorId || null,
      studentId,
    ]
  );

  if (!rows[0]) {
    throw new AppError(
      'Student not found',
      404
    );
  }

  return rows[0];
}

function generateTempPassword() {
  let result = '';

  for (let i = 0; i < 12; i += 1) {
    const index = crypto.randomInt(
      0,
      TEMP_PASSWORD_ALPHABET.length
    );

    result += TEMP_PASSWORD_ALPHABET[index];
  }

  return result;
}

async function createAccount({ name, email, role }) {
  const cleanName = requireString(name, 'name', {
    min: 1,
    max: 150,
  });

  const cleanEmail = requireEmail(email);

  if (!role || !CREATABLE_ROLES.includes(role)) {
    throw new AppError(
      'role must be industry_supervisor, university_supervisor or hod',
      400
    );
  }

  const existing = await db.query(
    'SELECT id FROM users WHERE email = $1',
    [cleanEmail]
  );

  if (existing.rows.length > 0) {
    throw new AppError(
      'An account with this email already exists',
      409
    );
  }

  const tempPassword = generateTempPassword();

  const passwordHash = await bcrypt.hash(
    tempPassword,
    SALT_ROUNDS
  );

  const { rows } = await db.query(
    `INSERT INTO users (
       name,
       email,
       password_hash,
       role,
       email_verified
     )
     VALUES ($1, $2, $3, $4, TRUE)
     RETURNING
       id,
       name,
       email,
       role,
       email_verified,
       created_at`,
    [
      cleanName,
      cleanEmail,
      passwordHash,
      role,
    ]
  );

  const user = rows[0];

  if (role === 'industry_supervisor') {
    await db.query(
      'INSERT INTO industry_supervisors (user_id) VALUES ($1)',
      [user.id]
    );
  } else if (role === 'university_supervisor') {
    await db.query(
      'INSERT INTO university_supervisors (user_id) VALUES ($1)',
      [user.id]
    );
  }

  let emailSent = true;

  try {
    await sendAccountCreatedEmail(
      user.email,
      user.name,
      user.role,
      tempPassword
    );
  } catch (err) {
    emailSent = false;

    console.error(
      '[createAccount] account created email failed to send:',
      err.message
    );
  }

  return {
    user,
    tempPassword,
    emailSent,
  };
}

async function listUsers() {
  const { rows } = await db.query(
    `SELECT id, name, email, role, email_verified, is_active, created_at
     FROM users
     ORDER BY created_at DESC`
  );

  return rows;
}

async function setUserActive({ userId, isActive, actingUserId }) {
  requireUuid(userId, 'userId');

  if (typeof isActive !== 'boolean') {
    throw new AppError('isActive must be true or false', 400);
  }

  if (userId === actingUserId && !isActive) {
    throw new AppError('You cannot deactivate your own account', 400);
  }

  const { rows } = await db.query(
    `UPDATE users
     SET is_active = $1, updated_at = now()
     WHERE id = $2
     RETURNING id, name, email, role, email_verified, is_active`,
    [isActive, userId]
  );

  if (!rows[0]) {
    throw new AppError('User not found', 404);
  }

  if (!isActive) {
    await db.query(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1',
      [userId]
    );
  }

  return rows[0];
}

module.exports = {
  listStudents,
  getDashboard,
  listSupervisors,
  assignStudentSupervisors,
  createAccount,
  listUsers,
  setUserActive,
};