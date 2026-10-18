const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireUuid, optionalString } = require('../../utils/validators');
const studentsService = require('../students/students.service');
const requestContext = require('../../utils/requestContext');

const VALID_STATUSES = ['present', 'absent', 'excused', 'partial'];
const REASONS = ['sick', 'transport', 'permission', 'other'];
const REASON_STATUSES = ['absent', 'excused'];
const MAX_RANGE_DAYS = 31;
const DEFAULT_LIST_LIMIT = 120;
const MAX_LIST_LIMIT = 400;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateString(value, name) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(`${name} must be a date in YYYY-MM-DD format`, 400);
  }
  const time = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) {
    throw new AppError(`${name} is not a valid date`, 400);
  }
  return time;
}

function formatDate(time) {
  return new Date(time).toISOString().slice(0, 10);
}

function todayTime() {
  return Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
}

function referenceDayTime() {
  const trusted = requestContext.getTrustedNow();
  return Date.parse(`${trusted.toISOString().slice(0, 10)}T00:00:00Z`);
}

function enumerateDates(fromTime, toTime, weekdaysOnly) {
  const dates = [];
  for (let time = fromTime; time <= toTime; time += DAY_MS) {
    const day = new Date(time).getUTCDay();
    if (weekdaysOnly && (day === 0 || day === 6)) continue;
    dates.push(formatDate(time));
  }
  return dates;
}

function requireIndustryContext(supervisorContext) {
  if (!supervisorContext || supervisorContext.column !== 'industry_supervisor_id') {
    throw new AppError('Only industrial supervisors can record attendance', 403);
  }
}

async function assertActiveSupervisor(student, supervisorId, dates) {
  const { rows } = await db.query(
    `SELECT industry_supervisor_id,
            to_char(start_date, 'YYYY-MM-DD') AS start_date,
            to_char(end_date, 'YYYY-MM-DD') AS end_date
     FROM temp_supervisor_assignments
     WHERE student_id = $1`,
    [student.id]
  );

  for (const date of dates) {
    const covering = rows.filter(
      (row) => row.start_date <= date && (!row.end_date || row.end_date >= date)
    );
    const activeIds =
      covering.length > 0
        ? covering.map((row) => row.industry_supervisor_id)
        : [student.industry_supervisor_id];

    if (!activeIds.includes(supervisorId)) {
      throw new AppError(
        `You were not the active industrial supervisor on ${date}, so you cannot mark attendance for that day`,
        403,
        'NOT_ACTIVE_SUPERVISOR'
      );
    }
  }
}

async function getSettingNumber(key, fallback) {
  const { rows } = await db.query('SELECT value FROM app_settings WHERE key = $1', [key]);
  const number = rows[0] ? Number(rows[0].value) : NaN;
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

async function getSettings() {
  return {
    correctionDays: await getSettingNumber('attendance_correction_days', 7),
    backfillDays: await getSettingNumber('attendance_backfill_days', 31),
    reminderDays: await getSettingNumber('attendance_reminder_days', 7),
  };
}

async function markAttendance({
  supervisorContext,
  userId,
  studentId,
  dateFrom,
  dateTo,
  status,
  reason,
  notes,
  weekdaysOnly = true,
  requireReason = true,
}) {
  requireUuid(studentId, 'studentId');
  requireIndustryContext(supervisorContext);

  if (!status || !VALID_STATUSES.includes(status)) {
    throw new AppError('Invalid attendance status', 400);
  }

  const fromTime = parseDateString(dateFrom, 'dateFrom');
  const toTime = parseDateString(dateTo || dateFrom, 'dateTo');
  if (toTime < fromTime) {
    throw new AppError('The end date cannot be before the start date', 400);
  }
  if ((toTime - fromTime) / DAY_MS + 1 > MAX_RANGE_DAYS) {
    throw new AppError(`A range can cover at most ${MAX_RANGE_DAYS} days`, 400);
  }

  const today = todayTime();
  if (toTime > today + DAY_MS) {
    throw new AppError('Attendance cannot be recorded for future dates', 400);
  }

  let cleanReason = null;
  if (REASON_STATUSES.includes(status)) {
    if (reason) {
      if (!REASONS.includes(reason)) {
        throw new AppError('Invalid reason', 400);
      }
      cleanReason = reason;
    } else if (requireReason) {
      throw new AppError('Choose a reason for an absent or excused day', 400);
    }
  }

  const cleanNotes = optionalString(notes, { max: 2000 });

  const student = await studentsService.getById(studentId);

  const dates = enumerateDates(fromTime, toTime, weekdaysOnly);
  if (dates.length === 0) {
    throw new AppError(
      'The chosen range has no weekdays. Untick "Weekdays only" to include weekends.',
      400
    );
  }

  await assertActiveSupervisor(student, supervisorContext.id, dates);

  const timing = requestContext.getTiming();
  const reference = referenceDayTime();
  const correctionDays = await getSettingNumber('attendance_correction_days', 7);
  const backfillDays = await getSettingNumber('attendance_backfill_days', 31);

  const { rows: existingRows } = await db.query(
    `SELECT id,
            to_char(attendance_date, 'YYYY-MM-DD') AS date,
            status::text AS status,
            reason,
            notes
     FROM attendance
     WHERE student_id = $1 AND attendance_date = ANY($2::date[])`,
    [studentId, dates]
  );
  const existingByDate = new Map(existingRows.map((row) => [row.date, row]));

  const toCreate = [];
  const toUpdate = [];
  let unchanged = 0;

  for (const date of dates) {
    const ageDays = Math.round((reference - Date.parse(`${date}T00:00:00Z`)) / DAY_MS);
    const existing = existingByDate.get(date);

    if (!existing) {
      if (ageDays > backfillDays) {
        throw new AppError(
          `${date} is more than ${backfillDays} days ago and can no longer be added`,
          409,
          'RECORD_LOCKED'
        );
      }
      toCreate.push(date);
      continue;
    }

    const same =
      existing.status === status &&
      (existing.reason || null) === cleanReason &&
      (existing.notes || null) === cleanNotes;

    if (same) {
      unchanged += 1;
      continue;
    }

    if (ageDays > correctionDays) {
      throw new AppError(
        `${date} is more than ${correctionDays} days ago and can no longer be corrected`,
        409,
        'RECORD_LOCKED'
      );
    }
    toUpdate.push(existing);
  }

  let created = 0;
  let updated = 0;

  try {
    if (toCreate.length > 0) {
      const { rows } = await db.query(
        `INSERT INTO attendance
           (student_id, industry_supervisor_id, attendance_date, status, reason, notes, marked_by,
            client_created_at, server_received_at, clock_offset_ms, clock_flagged)
         SELECT $1::uuid, $2::uuid, d, $4::attendance_status, $5::varchar, $6::text, $7::uuid,
                $8::timestamptz, $9::timestamptz, $10::bigint, $11::boolean
         FROM unnest($3::date[]) AS d
         RETURNING id`,
        [
          studentId,
          supervisorContext.id,
          toCreate,
          status,
          cleanReason,
          cleanNotes,
          userId,
          timing ? timing.clientCreatedAt : null,
          timing ? timing.serverReceivedAt : new Date(),
          timing ? timing.offsetMs : null,
          timing ? timing.flagged : false,
        ]
      );
      created = rows.length;

      await db.query(
        `INSERT INTO attendance_changes
           (attendance_id, change_type, new_status, new_reason, changed_by, client_created_at, clock_flagged)
         SELECT t.id, 'created', $2::attendance_status, $3::varchar, $4::uuid, $5::timestamptz, $6::boolean
         FROM unnest($1::uuid[]) AS t(id)`,
        [
          rows.map((row) => row.id),
          status,
          cleanReason,
          userId,
          timing ? timing.clientCreatedAt : null,
          timing ? timing.flagged : false,
        ]
      );
    }

    if (toUpdate.length > 0) {
      await db.query(
        `INSERT INTO attendance_changes
           (attendance_id, change_type, previous_status, new_status, previous_reason, new_reason, changed_by,
            client_created_at, clock_flagged)
         SELECT t.id, 'updated', t.previous_status::attendance_status, $4::attendance_status,
                t.previous_reason, $5::varchar, $6::uuid, $7::timestamptz, $8::boolean
         FROM unnest($1::uuid[], $2::text[], $3::text[]) AS t(id, previous_status, previous_reason)`,
        [
          toUpdate.map((row) => row.id),
          toUpdate.map((row) => row.status),
          toUpdate.map((row) => row.reason),
          status,
          cleanReason,
          userId,
          timing ? timing.clientCreatedAt : null,
          timing ? timing.flagged : false,
        ]
      );

      const { rows } = await db.query(
        `UPDATE attendance
         SET status = $2::attendance_status,
             reason = $3,
             notes = $4,
             marked_by = $5,
             industry_supervisor_id = $6,
             updated_at = now()
         WHERE id = ANY($1::uuid[])
         RETURNING id`,
        [toUpdate.map((row) => row.id), status, cleanReason, cleanNotes, userId, supervisorContext.id]
      );
      updated = rows.length;
    }
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError(
        'Attendance for one of these days was just recorded. Please reload and try again.',
        409
      );
    }
    throw err;
  }

  return { created, updated, unchanged, days: dates.length };
}

async function listForStudent(studentId, requester, limit) {
  requireUuid(studentId, 'studentId');
  const student = await studentsService.getById(studentId);

  const isOwnRecord = requester.role === 'student' && student.user_id === requester.id;
  const isIndustrySupervisor =
    requester.role === 'industry_supervisor' &&
    (await studentsService.isIndustrySupervisorOf(student, requester.supervisorId));
  const isUniversitySupervisor =
    requester.role === 'university_supervisor' &&
    requester.supervisorId === student.university_supervisor_id;
  const isOversight = requester.role === 'admin' || requester.role === 'hod';

  if (!isOwnRecord && !isIndustrySupervisor && !isUniversitySupervisor && !isOversight) {
    throw new AppError('You do not have access to this student\'s attendance', 403);
  }

  const safeLimit = Math.min(
    Math.max(parseInt(limit, 10) || DEFAULT_LIST_LIMIT, 1),
    MAX_LIST_LIMIT
  );

  const { rows } = await db.query(
    `SELECT a.id,
            to_char(a.attendance_date, 'YYYY-MM-DD') AS attendance_date,
            to_char(a.attendance_date, 'YYYY-MM-DD') AS week_start_date,
            a.status,
            a.reason,
            a.notes,
            u.name AS marked_by_name,
            a.created_at,
            a.updated_at
     FROM attendance a
     LEFT JOIN users u ON u.id = a.marked_by
     WHERE a.student_id = $1
     ORDER BY a.attendance_date DESC
     LIMIT $2`,
    [studentId, safeLimit]
  );
  return rows;
}

async function listMyStudents(supervisorContext) {
  requireIndustryContext(supervisorContext);

  const settings = await getSettings();

  const { rows } = await db.query(
    `SELECT s.id AS student_id,
            s.name,
            s.programme,
            to_char(st.last_date, 'YYYY-MM-DD') AS last_recorded,
            (CURRENT_DATE - st.last_date)::int AS days_since,
            st.present_count,
            st.absent_count,
            st.excused_count,
            st.partial_count
     FROM students s
     LEFT JOIN LATERAL (
       SELECT MAX(a.attendance_date) AS last_date,
              COUNT(*) FILTER (WHERE a.status = 'present')::int AS present_count,
              COUNT(*) FILTER (WHERE a.status = 'absent')::int AS absent_count,
              COUNT(*) FILTER (WHERE a.status = 'excused')::int AS excused_count,
              COUNT(*) FILTER (WHERE a.status = 'partial')::int AS partial_count
       FROM attendance a
       WHERE a.student_id = s.id
     ) st ON TRUE
     WHERE s.industry_supervisor_id = $1
        OR EXISTS (
             SELECT 1
             FROM temp_supervisor_assignments t
             WHERE t.student_id = s.id
               AND t.industry_supervisor_id = $1
               AND t.end_date IS NULL
           )
     ORDER BY s.name`,
    [supervisorContext.id]
  );

  return { settings, students: rows };
}

module.exports = {
  markAttendance,
  listForStudent,
  listMyStudents,
  getSettingNumber,
  getSettings,
};

