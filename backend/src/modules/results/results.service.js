const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireUuid } = require('../../utils/validators');
const assessmentsService = require('../assessments/assessments.service');
const notificationsService = require('../notifications/notifications.service');

const KIND_LABELS = {
  industry: 'industrial supervisor',
  university: 'university supervisor',
};

function round2(value) {
  return Math.round(value * 100) / 100;
}

function toPercent(total, max) {
  const totalNumber = Number(total);
  const maxNumber = Number(max);
  if (!Number.isFinite(totalNumber) || !Number.isFinite(maxNumber) || maxNumber <= 0) {
    return null;
  }
  return round2((totalNumber / maxNumber) * 100);
}

function toNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

async function getFormsStatus() {
  const forms = await assessmentsService.listForms();
  const industry = forms.find((form) => form.kind === 'industry');
  const university = forms.find((form) => form.kind === 'university');
  const weights = {
    industry: industry.weight_percent,
    university: university.weight_percent,
  };

  const unconfirmed = [];
  if (!industry.confirmed_at) unconfirmed.push('industrial');
  if (!university.confirmed_at) unconfirmed.push('university');

  const totalWeight = weights.industry + weights.university;
  let message = null;

  if (unconfirmed.length > 0) {
    message = `The ${unconfirmed.join(' and ')} assessment form${unconfirmed.length > 1 ? 's are' : ' is'} not confirmed yet.`;
  } else if (Math.abs(totalWeight - 100) > 0.001) {
    message = `The form weights add up to ${totalWeight}%, not 100%.`;
  }

  return { ready: message === null, message, weights };
}

function deriveStage(row) {
  if (row.result_id) {
    if (row.released_at) return 'released';
    if (row.result_status === 'approved') return 'approved';
    if (row.sent_to_hod_at) return 'sent';
    return 'compiled';
  }
  if (row.industry_status === 'submitted' && row.university_status === 'submitted') {
    return 'ready';
  }
  return 'incomplete';
}

function isStale(row) {
  if (!row.result_id || row.result_status !== 'compiled') return false;
  const compiledAt = new Date(row.compiled_at).getTime();
  const industryChanged =
    row.industry_submitted_at && new Date(row.industry_submitted_at).getTime() > compiledAt;
  const universityChanged =
    row.university_submitted_at && new Date(row.university_submitted_at).getTime() > compiledAt;
  return Boolean(industryChanged || universityChanged);
}

async function getCompileOverview() {
  const formsStatus = await getFormsStatus();

  const { rows } = await db.query(
    `SELECT s.id AS student_id,
            s.name,
            s.email,
            s.programme,
            COALESCE(ia.status::text, 'not_started') AS industry_status,
            ia.total_marks AS industry_total,
            ia.max_total AS industry_max,
            ia.submitted_at AS industry_submitted_at,
            COALESCE(ua.status::text, 'not_started') AS university_status,
            ua.total_marks AS university_total,
            ua.max_total AS university_max,
            ua.submitted_at AS university_submitted_at,
            r.id AS result_id,
            r.status AS result_status,
            r.industry_percent,
            r.university_percent,
            r.final_percent,
            r.compiled_at,
            r.sent_to_hod_at,
            r.approved_at,
            r.released_at
     FROM students s
     LEFT JOIN assessments ia ON ia.student_id = s.id AND ia.kind = 'industry'
     LEFT JOIN assessments ua ON ua.student_id = s.id AND ua.kind = 'university'
     LEFT JOIN results r ON r.student_id = s.id
     ORDER BY s.name`
  );

  const students = rows.map((row) => ({
    student_id: row.student_id,
    name: row.name,
    email: row.email,
    programme: row.programme,
    industry: {
      status: row.industry_status,
      percent:
        row.industry_status === 'submitted' ? toPercent(row.industry_total, row.industry_max) : null,
    },
    university: {
      status: row.university_status,
      percent:
        row.university_status === 'submitted'
          ? toPercent(row.university_total, row.university_max)
          : null,
    },
    result: row.result_id
      ? {
          id: row.result_id,
          status: row.result_status,
          industry_percent: toNumber(row.industry_percent),
          university_percent: toNumber(row.university_percent),
          final_percent: toNumber(row.final_percent),
          compiled_at: row.compiled_at,
          sent_to_hod_at: row.sent_to_hod_at,
          approved_at: row.approved_at,
          released_at: row.released_at,
        }
      : null,
    stage: deriveStage(row),
    needs_recompile: isStale(row),
  }));

  return { forms: formsStatus, students };
}

async function compileOne({ studentId, userId, weights }) {
  const { rows } = await db.query(
    `SELECT id, kind, status, total_marks, max_total
     FROM assessments
     WHERE student_id = $1`,
    [studentId]
  );

  const industry = rows.find((row) => row.kind === 'industry');
  const university = rows.find((row) => row.kind === 'university');

  if (
    !industry ||
    industry.status !== 'submitted' ||
    !university ||
    university.status !== 'submitted'
  ) {
    throw new AppError('Both assessments must be submitted before compiling', 409);
  }

  const industryPercent = toPercent(industry.total_marks, industry.max_total);
  const universityPercent = toPercent(university.total_marks, university.max_total);
  if (industryPercent === null || universityPercent === null) {
    throw new AppError('An assessment has no marks recorded and cannot be compiled', 409);
  }

  const finalPercent = round2(
    (industryPercent * weights.industry) / 100 + (universityPercent * weights.university) / 100
  );

  const { rows: saved } = await db.query(
    `INSERT INTO results
       (student_id, industry_assessment_id, university_assessment_id, industry_percent,
        university_percent, industry_weight, university_weight, final_percent, compiled_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (student_id)
     DO UPDATE SET industry_assessment_id = EXCLUDED.industry_assessment_id,
                   university_assessment_id = EXCLUDED.university_assessment_id,
                   industry_percent = EXCLUDED.industry_percent,
                   university_percent = EXCLUDED.university_percent,
                   industry_weight = EXCLUDED.industry_weight,
                   university_weight = EXCLUDED.university_weight,
                   final_percent = EXCLUDED.final_percent,
                   compiled_by = EXCLUDED.compiled_by,
                   compiled_at = now(),
                   sent_to_hod_at = NULL,
                   updated_at = now()
     WHERE results.status = 'compiled'
     RETURNING *`,
    [
      studentId,
      industry.id,
      university.id,
      industryPercent,
      universityPercent,
      weights.industry,
      weights.university,
      finalPercent,
      userId,
    ]
  );

  if (saved.length === 0) {
    throw new AppError('This result has been approved and can no longer be recompiled', 409);
  }

  return saved[0];
}

async function compile({ studentId, userId }) {
  requireUuid(studentId, 'studentId');

  const formsStatus = await getFormsStatus();
  if (!formsStatus.ready) {
    throw new AppError(formsStatus.message, 409);
  }

  const { rows } = await db.query('SELECT id FROM students WHERE id = $1', [studentId]);
  if (!rows[0]) {
    throw new AppError('Student not found', 404);
  }

  return compileOne({ studentId, userId, weights: formsStatus.weights });
}

async function compileAll({ userId }) {
  const formsStatus = await getFormsStatus();
  if (!formsStatus.ready) {
    throw new AppError(formsStatus.message, 409);
  }

  const { rows } = await db.query(
    `SELECT s.id
     FROM students s
     JOIN assessments ia ON ia.student_id = s.id AND ia.kind = 'industry' AND ia.status = 'submitted'
     JOIN assessments ua ON ua.student_id = s.id AND ua.kind = 'university' AND ua.status = 'submitted'
     LEFT JOIN results r ON r.student_id = s.id
     WHERE r.id IS NULL
        OR (r.status = 'compiled'
            AND (ia.submitted_at > r.compiled_at OR ua.submitted_at > r.compiled_at))`
  );

  let compiled = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      await compileOne({ studentId: row.id, userId, weights: formsStatus.weights });
      compiled += 1;
    } catch (err) {
      failed += 1;
      console.error('[compileAll] failed for student', row.id, err.message);
    }
  }

  return { compiled, failed };
}

async function remind({ studentId }) {
  requireUuid(studentId, 'studentId');

  const { rows: studentRows } = await db.query('SELECT name FROM students WHERE id = $1', [
    studentId,
  ]);
  if (!studentRows[0]) {
    throw new AppError('Student not found', 404);
  }
  const studentName = studentRows[0].name;

  const { rows: assessmentRows } = await db.query(
    `SELECT kind FROM assessments WHERE student_id = $1 AND status = 'submitted'`,
    [studentId]
  );
  const submitted = new Set(assessmentRows.map((row) => row.kind));
  const missing = ['industry', 'university'].filter((kind) => !submitted.has(kind));

  if (missing.length === 0) {
    throw new AppError('Both assessments have already been submitted', 409);
  }

  const recipients = [];

  if (missing.includes('industry')) {
    const { rows } = await db.query(
      `SELECT isup.user_id
       FROM students s
       JOIN industry_supervisors isup ON isup.id = s.industry_supervisor_id
       WHERE s.id = $1
       UNION
       SELECT isup.user_id
       FROM temp_supervisor_assignments t
       JOIN industry_supervisors isup ON isup.id = t.industry_supervisor_id
       WHERE t.student_id = $1 AND t.end_date IS NULL`,
      [studentId]
    );
    rows.forEach((row) => recipients.push({ userId: row.user_id, kind: 'industry' }));
  }

  if (missing.includes('university')) {
    const { rows } = await db.query(
      `SELECT usup.user_id
       FROM students s
       JOIN university_supervisors usup ON usup.id = s.university_supervisor_id
       WHERE s.id = $1`,
      [studentId]
    );
    rows.forEach((row) => recipients.push({ userId: row.user_id, kind: 'university' }));
  }

  if (recipients.length === 0) {
    throw new AppError('No supervisor is assigned for the missing assessment', 409);
  }

  for (const recipient of recipients) {
    await notificationsService.notifySafe({
      userId: recipient.userId,
      type: 'assessment_reminder',
      title: `Assessment needed: ${studentName}`,
      body: `Please complete and submit the ${KIND_LABELS[recipient.kind]} assessment for ${studentName}.`,
      relatedId: studentId,
    });
  }

  return { notified: recipients.length, missing };
}

async function sendToHod() {
  const { rows } = await db.query(
    `UPDATE results r
     SET sent_to_hod_at = now(), updated_at = now()
     WHERE r.status = 'compiled'
       AND r.sent_to_hod_at IS NULL
       AND NOT EXISTS (
         SELECT 1
         FROM assessments a
         WHERE a.student_id = r.student_id
           AND a.status = 'submitted'
           AND a.submitted_at > r.compiled_at
       )
     RETURNING r.student_id`
  );

  if (rows.length === 0) {
    throw new AppError('No compiled results are waiting to be sent', 409);
  }

  const { rows: hods } = await db.query(
    `SELECT id FROM users WHERE role = 'hod' AND is_active = TRUE`
  );

  for (const hod of hods) {
    await notificationsService.notifySafe({
      userId: hod.id,
      type: 'results_ready',
      title: 'Results ready for approval',
      body: `${rows.length} compiled result${rows.length === 1 ? ' is' : 's are'} waiting for your approval.`,
    });
  }

  return { sent: rows.length, notified: hods.length };
}

async function getHodResults() {
  const { rows } = await db.query(
    `SELECT r.id,
            r.status,
            r.industry_percent,
            r.university_percent,
            r.industry_weight,
            r.university_weight,
            r.final_percent,
            r.sent_to_hod_at,
            r.approved_at,
            r.released_at,
            s.name,
            s.email,
            s.programme
     FROM results r
     JOIN students s ON s.id = r.student_id
     WHERE r.sent_to_hod_at IS NOT NULL
     ORDER BY s.name`
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    programme: row.programme,
    industry_percent: toNumber(row.industry_percent),
    university_percent: toNumber(row.university_percent),
    industry_weight: toNumber(row.industry_weight),
    university_weight: toNumber(row.university_weight),
    final_percent: toNumber(row.final_percent),
    sent_to_hod_at: row.sent_to_hod_at,
    approved_at: row.approved_at,
    released_at: row.released_at,
    stage: row.released_at ? 'released' : row.status === 'approved' ? 'approved' : 'awaiting',
  }));
}

async function approve({ resultId, userId }) {
  requireUuid(resultId, 'resultId');

  const { rows } = await db.query(
    `UPDATE results
     SET status = 'approved', approved_by = $2, approved_at = now(), updated_at = now()
     WHERE id = $1 AND status = 'compiled' AND sent_to_hod_at IS NOT NULL
     RETURNING *`,
    [resultId, userId]
  );

  if (rows.length === 0) {
    const { rows: existing } = await db.query('SELECT status FROM results WHERE id = $1', [resultId]);
    if (!existing[0]) {
      throw new AppError('Result not found', 404);
    }
    throw new AppError('This result has already been approved or has not been sent yet', 409);
  }

  return rows[0];
}

async function approveAll({ userId }) {
  const { rows } = await db.query(
    `UPDATE results
     SET status = 'approved', approved_by = $1, approved_at = now(), updated_at = now()
     WHERE status = 'compiled' AND sent_to_hod_at IS NOT NULL
     RETURNING id`,
    [userId]
  );

  return { approved: rows.length };
}

async function notifyReleased(studentIds) {
  if (studentIds.length === 0) return;

  const { rows } = await db.query(
    `SELECT id, user_id FROM students WHERE id = ANY($1::uuid[]) AND user_id IS NOT NULL`,
    [studentIds]
  );

  for (const row of rows) {
    await notificationsService.notifySafe({
      userId: row.user_id,
      type: 'result_released',
      title: 'Your final result is available',
      body: 'Your end-of-semester attachment result has been released.',
      relatedId: row.id,
    });
  }
}

async function release({ resultId, userId }) {
  requireUuid(resultId, 'resultId');

  const { rows } = await db.query(
    `UPDATE results
     SET released_by = $2, released_at = now(), updated_at = now()
     WHERE id = $1 AND status = 'approved' AND released_at IS NULL
     RETURNING *`,
    [resultId, userId]
  );

  if (rows.length === 0) {
    const { rows: existing } = await db.query(
      'SELECT status, released_at FROM results WHERE id = $1',
      [resultId]
    );
    if (!existing[0]) {
      throw new AppError('Result not found', 404);
    }
    if (existing[0].released_at) {
      throw new AppError('This result has already been released', 409);
    }
    throw new AppError('Only approved results can be released', 409);
  }

  await notifyReleased([rows[0].student_id]);
  return rows[0];
}

async function releaseAll({ userId }) {
  const { rows } = await db.query(
    `UPDATE results
     SET released_by = $1, released_at = now(), updated_at = now()
     WHERE status = 'approved' AND released_at IS NULL
     RETURNING student_id`,
    [userId]
  );

  await notifyReleased(rows.map((row) => row.student_id));
  return { released: rows.length };
}

async function getMyResult(userId) {
  const { rows } = await db.query(
    `SELECT r.final_percent, r.released_at
     FROM results r
     JOIN students s ON s.id = r.student_id
     WHERE s.user_id = $1 AND r.released_at IS NOT NULL`,
    [userId]
  );

  if (!rows[0]) {
    return null;
  }

  return { final_percent: Number(rows[0].final_percent), released_at: rows[0].released_at };
}

module.exports = {
  getCompileOverview,
  compile,
  compileAll,
  remind,
  sendToHod,
  getHodResults,
  approve,
  approveAll,
  release,
  releaseAll,
  getMyResult,
};