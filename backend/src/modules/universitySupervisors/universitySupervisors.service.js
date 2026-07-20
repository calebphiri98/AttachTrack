const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const studentsService = require('../students/students.service');

async function getSupervisorRecordByUserId(userId) {
  const { rows } = await db.query('SELECT * FROM university_supervisors WHERE user_id = $1', [
    userId,
  ]);
  const record = rows[0];
  if (!record) {
    throw new AppError('University supervisor profile not found', 404);
  }
  return record;
}

async function addStudent(userId, { name, email }) {
  if (!name || !email) {
    throw new AppError('name and email are required', 400);
  }
  const supervisor = await getSupervisorRecordByUserId(userId);

  return studentsService.assignSupervisor({
    email,
    name,
    supervisorColumn: 'university_supervisor_id',
    supervisorId: supervisor.id,
  });
}

async function listStudents(userId) {
  const supervisor = await getSupervisorRecordByUserId(userId);
  return studentsService.listBySupervisor('university_supervisor_id', supervisor.id);
}

module.exports = { addStudent, listStudents, getSupervisorRecordByUserId };
