const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireString, requireEmail } = require('../../utils/validators');
const studentsService = require('../students/students.service');

async function getSupervisorRecordByUserId(userId) {
  const { rows } = await db.query('SELECT * FROM industry_supervisors WHERE user_id = $1', [
    userId,
  ]);
  const record = rows[0];
  if (!record) {
    throw new AppError('Industry supervisor profile not found', 404);
  }
  return record;
}

async function addStudent(userId, { name, email }) {
  const cleanName = requireString(name, 'name', { max: 150 });
  const cleanEmail = requireEmail(email);

  const supervisor = await getSupervisorRecordByUserId(userId);

  return studentsService.assignSupervisor({
    email: cleanEmail,
    name: cleanName,
    supervisorColumn: 'industry_supervisor_id',
    supervisorId: supervisor.id,
  });
}

async function listStudents(userId) {
  const supervisor = await getSupervisorRecordByUserId(userId);
  return studentsService.listBySupervisor('industry_supervisor_id', supervisor.id);
}

async function listAll() {
  const { rows } = await db.query(
    `SELECT i.id, i.company_name, u.name, u.email
     FROM industry_supervisors i
     JOIN users u ON u.id = i.user_id
     ORDER BY u.name ASC`
  );
  return rows;
}

module.exports = { addStudent, listStudents, listAll, getSupervisorRecordByUserId };
