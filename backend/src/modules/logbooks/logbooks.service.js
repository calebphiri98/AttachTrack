const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireUuid, requireString, requireDate, optionalString } = require('../../utils/validators');
const studentsService = require('../students/students.service');
const { uploadBuffer } = require('../../utils/uploadToCloudinary');

async function listForStudent(studentId, requester) {
  requireUuid(studentId, 'studentId');
  const student = await studentsService.getById(studentId);

  const isOwnRecord = requester.role === 'student' && student.user_id === requester.id;
  const isIndustrySupervisor =
    requester.role === 'industry_supervisor' && requester.supervisorId === student.industry_supervisor_id;
  const isUniversitySupervisor =
    requester.role === 'university_supervisor' && requester.supervisorId === student.university_supervisor_id;

  if (!isOwnRecord && !isIndustrySupervisor && !isUniversitySupervisor) {
    throw new AppError('You do not have access to this student logbook', 403);
  }

  const { rows } = await db.query(
    `SELECT id, student_id, entry_date, activity, notes, attachment_url, attachment_name, created_at
     FROM logbook_entries
     WHERE student_id = $1
     ORDER BY entry_date DESC, created_at DESC`,
    [studentId]
  );

  return rows;
}

async function listMine(userId) {
  const student = await studentsService.getByUserId(userId);
  return listForStudent(student.id, { role: 'student', id: userId });
}

async function createEntry({ userId, entryDate, activity, notes, file }) {
  const student = await studentsService.getByUserId(userId);
  const cleanDate = requireDate(entryDate, 'entryDate');
  const cleanActivity = requireString(activity, 'activity', { max: 4000 });
  const cleanNotes = optionalString(notes, { max: 4000 });

  let attachmentUrl = null;
  let attachmentName = null;

  if (file) {
    const upload = await uploadBuffer(file.buffer, {
      folder: `attachtrack/logbooks/${student.id}`,
      filename: `${Date.now()}-${file.originalname}`,
    });
    attachmentUrl = upload.secure_url;
    attachmentName = file.originalname;
  }

  const { rows } = await db.query(
    `INSERT INTO logbook_entries (student_id, entry_date, activity, notes, attachment_url, attachment_name)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [student.id, cleanDate, cleanActivity, cleanNotes, attachmentUrl, attachmentName]
  );

  return rows[0];
}

module.exports = { createEntry, listMine, listForStudent };
