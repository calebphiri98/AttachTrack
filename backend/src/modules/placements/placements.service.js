const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireUuid, optionalString } = require('../../utils/validators');
const notificationsService = require('../notifications/notifications.service');

async function listOverview() {
  const { rows } = await db.query(
    `SELECT s.id AS student_id,
            s.name,
            s.email,
            s.programme,
            p.id AS placement_id,
            p.company_id,
            c.name AS company_name,
            c.industry_sector,
            p.preference_note,
            p.allocated_at,
            p.confirmed_at,
            COALESCE(p.status::text, 'unallocated') AS status
     FROM students s
     LEFT JOIN placements p ON p.student_id = s.id
     LEFT JOIN companies c ON c.id = p.company_id
     ORDER BY s.name`
  );
  return rows;
}

async function allocate({ studentId, companyId, preferenceNote, allocatedBy }) {
  requireUuid(studentId, 'studentId');
  requireUuid(companyId, 'companyId');
  const note = optionalString(preferenceNote, { max: 1000 });

  const { rows: studentRows } = await db.query('SELECT id FROM students WHERE id = $1', [studentId]);
  if (!studentRows[0]) {
    throw new AppError('Student not found', 404);
  }

  const { rows: companyRows } = await db.query(
    'SELECT id, available_places FROM companies WHERE id = $1',
    [companyId]
  );
  const company = companyRows[0];
  if (!company) {
    throw new AppError('Company not found', 404);
  }

  if (company.available_places !== null) {
    const { rows: countRows } = await db.query(
      'SELECT COUNT(*)::int AS count FROM placements WHERE company_id = $1 AND student_id <> $2',
      [companyId, studentId]
    );
    if (countRows[0].count >= company.available_places) {
      throw new AppError('This company has no places left', 409);
    }
  }

  const { rows } = await db.query(
    `INSERT INTO placements (student_id, company_id, preference_note, allocated_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (student_id)
     DO UPDATE SET company_id = EXCLUDED.company_id,
                   preference_note = EXCLUDED.preference_note,
                   allocated_by = EXCLUDED.allocated_by,
                   allocated_at = now(),
                   updated_at = now()
     WHERE placements.status = 'allocated'
     RETURNING *`,
    [studentId, companyId, note, allocatedBy]
  );

  if (rows.length === 0) {
    throw new AppError('This placement has been confirmed and can no longer be changed', 409);
  }

  return rows[0];
}

async function removeAllocation(studentId) {
  requireUuid(studentId, 'studentId');

  const { rows } = await db.query(
    `DELETE FROM placements
     WHERE student_id = $1 AND status = 'allocated'
     RETURNING *`,
    [studentId]
  );

  if (rows.length === 0) {
    const { rows: existing } = await db.query(
      'SELECT status FROM placements WHERE student_id = $1',
      [studentId]
    );
    if (existing[0]) {
      throw new AppError('This placement has been confirmed and can no longer be removed', 409);
    }
    throw new AppError('This student has no placement', 404);
  }

  return rows[0];
}

async function notifyConfirmed(studentIds) {
  if (studentIds.length === 0) return;

  const { rows } = await db.query(
    `SELECT s.id,
            s.name,
            s.user_id AS student_user_id,
            c.name AS company_name,
            p.id AS placement_id,
            isup.user_id AS industry_user_id,
            usup.user_id AS university_user_id
     FROM students s
     JOIN placements p ON p.student_id = s.id
     JOIN companies c ON c.id = p.company_id
     LEFT JOIN industry_supervisors isup ON isup.id = s.industry_supervisor_id
     LEFT JOIN university_supervisors usup ON usup.id = s.university_supervisor_id
     WHERE s.id = ANY($1::uuid[])`,
    [studentIds]
  );

  for (const row of rows) {
    if (row.student_user_id) {
      await notificationsService.notifySafe({
        userId: row.student_user_id,
        type: 'placement_confirmed',
        title: 'Your placement is confirmed',
        body: `Your attachment placement at ${row.company_name} has been confirmed.`,
        relatedId: row.placement_id,
      });
    }

    const supervisorIds = [row.industry_user_id, row.university_user_id].filter(Boolean);
    for (const userId of supervisorIds) {
      await notificationsService.notifySafe({
        userId,
        type: 'placement_confirmed',
        title: `Placement confirmed: ${row.name}`,
        body: `${row.name} has been placed at ${row.company_name}.`,
        relatedId: row.placement_id,
      });
    }
  }
}

async function confirm({ placementId, confirmedBy }) {
  requireUuid(placementId, 'placementId');

  const { rows } = await db.query(
    `UPDATE placements
     SET status = 'confirmed',
         confirmed_by = $2,
         confirmed_at = now(),
         updated_at = now()
     WHERE id = $1 AND status = 'allocated'
     RETURNING *`,
    [placementId, confirmedBy]
  );

  if (rows.length === 0) {
    const { rows: existing } = await db.query('SELECT status FROM placements WHERE id = $1', [placementId]);
    if (existing[0]) {
      throw new AppError('This placement has already been confirmed', 409);
    }
    throw new AppError('Placement not found', 404);
  }

  await notifyConfirmed([rows[0].student_id]);
  return rows[0];
}

async function confirmAll({ confirmedBy }) {
  const { rows } = await db.query(
    `UPDATE placements
     SET status = 'confirmed',
         confirmed_by = $1,
         confirmed_at = now(),
         updated_at = now()
     WHERE status = 'allocated'
     RETURNING student_id`,
    [confirmedBy]
  );

  await notifyConfirmed(rows.map((row) => row.student_id));
  return { confirmed: rows.length };
}

module.exports = { listOverview, allocate, removeAllocation, confirm, confirmAll };