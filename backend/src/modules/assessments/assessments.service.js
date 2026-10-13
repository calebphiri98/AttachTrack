const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireUuid, requireString, optionalString } = require('../../utils/validators');
const studentsService = require('../students/students.service');
const notificationsService = require('../notifications/notifications.service');

const KINDS = ['industry', 'university'];

function assertKind(kind) {
  if (!KINDS.includes(kind)) {
    throw new AppError('kind must be industry or university', 400);
  }
}

function parseNumber(value, name, min, max) {
  if (value === '' || value === null || value === undefined) {
    throw new AppError(`${name} is required`, 400);
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new AppError(`${name} must be a number`, 400);
  }
  if (number < min) {
    throw new AppError(`${name} must be at least ${min}`, 400);
  }
  if (max !== undefined && number > max) {
    throw new AppError(`${name} must be at most ${max}`, 400);
  }
  return Math.round(number * 100) / 100;
}

function requireIndustryContext(supervisorContext) {
  if (!supervisorContext || supervisorContext.column !== 'industry_supervisor_id') {
    throw new AppError('Only industrial supervisors can use this', 403);
  }
}

async function loadForm(kind) {
  assertKind(kind);

  const { rows } = await db.query('SELECT * FROM assessment_forms WHERE kind = $1', [kind]);
  const form = rows[0];
  if (!form) {
    throw new AppError('Assessment form not found', 404);
  }

  const { rows: criteria } = await db.query(
    `SELECT c.id, c.label, c.description, c.max_marks, c.sort_order, c.is_active,
            EXISTS (SELECT 1 FROM assessment_scores s WHERE s.criterion_id = c.id) AS in_use
     FROM assessment_criteria c
     WHERE c.form_id = $1
     ORDER BY c.sort_order, c.created_at`,
    [form.id]
  );

  return {
    id: form.id,
    kind: form.kind,
    title: form.title,
    weight_percent: Number(form.weight_percent),
    confirmed_at: form.confirmed_at,
    criteria: criteria.map((criterion) => ({
      ...criterion,
      max_marks: Number(criterion.max_marks),
    })),
  };
}

async function listForms() {
  const industry = await loadForm('industry');
  const university = await loadForm('university');
  return [industry, university];
}

async function invalidateConfirmation(formId) {
  await db.query(
    `UPDATE assessment_forms
     SET confirmed_at = NULL, confirmed_by = NULL, updated_at = now()
     WHERE id = $1`,
    [formId]
  );
}

async function updateFormSettings(kind, { title, weightPercent }) {
  const form = await loadForm(kind);

  const nextTitle =
    title !== undefined ? requireString(title, 'title', { min: 1, max: 200 }) : form.title;
  const nextWeight =
    weightPercent !== undefined
      ? parseNumber(weightPercent, 'weightPercent', 0, 100)
      : form.weight_percent;

  await db.query(
    `UPDATE assessment_forms
     SET title = $1, weight_percent = $2, confirmed_at = NULL, confirmed_by = NULL, updated_at = now()
     WHERE id = $3`,
    [nextTitle, nextWeight, form.id]
  );

  return loadForm(kind);
}

async function addCriterion(kind, { label, description, maxMarks }) {
  const form = await loadForm(kind);
  const cleanLabel = requireString(label, 'label', { min: 1, max: 200 });
  const cleanDescription = optionalString(description, { max: 1000 });
  const cleanMax = parseNumber(maxMarks, 'maxMarks', 0.01, 999);
  const nextOrder = form.criteria.reduce((highest, c) => Math.max(highest, c.sort_order), 0) + 1;

  await db.query(
    `INSERT INTO assessment_criteria (form_id, label, description, max_marks, sort_order)
     VALUES ($1, $2, $3, $4, $5)`,
    [form.id, cleanLabel, cleanDescription, cleanMax, nextOrder]
  );
  await invalidateConfirmation(form.id);

  return loadForm(kind);
}

async function getCriterion(criterionId) {
  requireUuid(criterionId, 'criterionId');
  const { rows } = await db.query(
    `SELECT c.*, f.kind
     FROM assessment_criteria c
     JOIN assessment_forms f ON f.id = c.form_id
     WHERE c.id = $1`,
    [criterionId]
  );
  if (!rows[0]) {
    throw new AppError('Criterion not found', 404);
  }
  return rows[0];
}

async function updateCriterion(criterionId, updates) {
  const existing = await getCriterion(criterionId);

  const nextLabel =
    updates.label !== undefined
      ? requireString(updates.label, 'label', { min: 1, max: 200 })
      : existing.label;
  const nextDescription =
    updates.description !== undefined
      ? optionalString(updates.description, { max: 1000 })
      : existing.description;
  const nextMax =
    updates.maxMarks !== undefined
      ? parseNumber(updates.maxMarks, 'maxMarks', 0.01, 999)
      : Number(existing.max_marks);

  let nextActive = existing.is_active;
  if (updates.isActive !== undefined) {
    if (typeof updates.isActive !== 'boolean') {
      throw new AppError('isActive must be true or false', 400);
    }
    nextActive = updates.isActive;
  }

  await db.query(
    `UPDATE assessment_criteria
     SET label = $1, description = $2, max_marks = $3, is_active = $4, updated_at = now()
     WHERE id = $5`,
    [nextLabel, nextDescription, nextMax, nextActive, criterionId]
  );
  await invalidateConfirmation(existing.form_id);

  return loadForm(existing.kind);
}

async function deleteCriterion(criterionId) {
  const existing = await getCriterion(criterionId);

  const { rows } = await db.query(
    'SELECT 1 FROM assessment_scores WHERE criterion_id = $1 LIMIT 1',
    [criterionId]
  );
  if (rows.length > 0) {
    throw new AppError('This criterion already has recorded marks. Deactivate it instead.', 409);
  }

  await db.query('DELETE FROM assessment_criteria WHERE id = $1', [criterionId]);
  await invalidateConfirmation(existing.form_id);

  return loadForm(existing.kind);
}

async function confirmForm(kind, userId) {
  const form = await loadForm(kind);

  if (!form.criteria.some((criterion) => criterion.is_active)) {
    throw new AppError('Add at least one active criterion before confirming', 409);
  }

  const forms = await listForms();
  const totalWeight = forms.reduce((sum, item) => sum + item.weight_percent, 0);
  if (Math.abs(totalWeight - 100) > 0.001) {
    throw new AppError(
      `The industrial and university weights must add up to 100% (currently ${totalWeight}%)`,
      409
    );
  }

  await db.query(
    `UPDATE assessment_forms
     SET confirmed_at = now(), confirmed_by = $1, updated_at = now()
     WHERE id = $2`,
    [userId, form.id]
  );

  return loadForm(kind);
}

async function listIndustryStudents(supervisorContext) {
  requireIndustryContext(supervisorContext);

  const { rows } = await db.query(
    `SELECT s.id AS student_id,
            s.name,
            s.email,
            s.programme,
            c.name AS company_name,
            COALESCE(a.status::text, 'not_started') AS status,
            a.total_marks,
            a.max_total,
            a.submitted_at
     FROM students s
     LEFT JOIN placements p ON p.student_id = s.id
     LEFT JOIN companies c ON c.id = p.company_id
     LEFT JOIN assessments a ON a.student_id = s.id AND a.kind = 'industry'
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

  return rows.map((row) => ({
    ...row,
    total_marks: row.total_marks === null ? null : Number(row.total_marks),
    max_total: row.max_total === null ? null : Number(row.max_total),
  }));
}

async function getIndustryAssessment(studentId, supervisorContext) {
  requireUuid(studentId, 'studentId');
  requireIndustryContext(supervisorContext);

  const student = await studentsService.assertSupervises(
    studentId,
    'industry_supervisor_id',
    supervisorContext.id
  );

  const form = await loadForm('industry');

  const { rows: assessmentRows } = await db.query(
    'SELECT * FROM assessments WHERE student_id = $1 AND kind = $2',
    [studentId, 'industry']
  );
  const assessment = assessmentRows[0] || null;

  let scores = [];
  if (assessment) {
    const { rows } = await db.query(
      `SELECT criterion_id, label, max_marks, marks, remark
       FROM assessment_scores
       WHERE assessment_id = $1`,
      [assessment.id]
    );
    scores = rows;
  }

  const scoreByCriterion = new Map(scores.map((row) => [row.criterion_id, row]));
  const formOrder = new Map(form.criteria.map((criterion, index) => [criterion.id, index]));
  const formById = new Map(form.criteria.map((criterion) => [criterion.id, criterion]));

  let items;
  if (assessment && assessment.status === 'submitted') {
    items = scores
      .map((row) => ({
        criterion_id: row.criterion_id,
        label: row.label,
        description: formById.get(row.criterion_id)?.description || null,
        max_marks: Number(row.max_marks),
        marks: Number(row.marks),
        remark: row.remark || '',
      }))
      .sort(
        (a, b) =>
          (formOrder.get(a.criterion_id) ?? 999) - (formOrder.get(b.criterion_id) ?? 999)
      );
  } else {
    items = form.criteria
      .filter((criterion) => criterion.is_active)
      .map((criterion) => {
        const saved = scoreByCriterion.get(criterion.id);
        return {
          criterion_id: criterion.id,
          label: criterion.label,
          description: criterion.description,
          max_marks: criterion.max_marks,
          marks: saved ? Number(saved.marks) : null,
          remark: saved?.remark || '',
        };
      });
  }

  return {
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      programme: student.programme,
    },
    form: { title: form.title, confirmed: Boolean(form.confirmed_at) },
    status: assessment ? assessment.status : 'not_started',
    comments: assessment?.comments || '',
    totalMarks: assessment && assessment.total_marks !== null ? Number(assessment.total_marks) : null,
    maxTotal: assessment && assessment.max_total !== null ? Number(assessment.max_total) : null,
    submittedAt: assessment ? assessment.submitted_at : null,
    items,
  };
}

async function notifyAssessmentSubmitted(studentId) {
  try {
    const { rows: studentRows } = await db.query('SELECT name FROM students WHERE id = $1', [
      studentId,
    ]);
    const studentName = studentRows[0]?.name || 'a student';

    const { rows: recipients } = await db.query(
      `SELECT usup.user_id
       FROM students s
       JOIN university_supervisors usup ON usup.id = s.university_supervisor_id
       WHERE s.id = $1
       UNION
       SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE`,
      [studentId]
    );

    for (const recipient of recipients) {
      await notificationsService.notifySafe({
        userId: recipient.user_id,
        type: 'assessment_submitted',
        title: `Assessment submitted: ${studentName}`,
        body: `The industrial supervisor has submitted the assessment for ${studentName}.`,
        relatedId: studentId,
      });
    }
  } catch (err) {
    console.error('[notifyAssessmentSubmitted] failed:', err.message);
  }
}

async function saveIndustryAssessment({
  studentId,
  supervisorContext,
  userId,
  scores,
  comments,
  submit,
}) {
  requireUuid(studentId, 'studentId');
  requireIndustryContext(supervisorContext);

  await studentsService.assertSupervises(studentId, 'industry_supervisor_id', supervisorContext.id);

  const cleanComments = optionalString(comments, { max: 3000 });
  if (!Array.isArray(scores)) {
    throw new AppError('scores must be a list', 400);
  }

  const form = await loadForm('industry');
  const active = new Map(
    form.criteria.filter((criterion) => criterion.is_active).map((criterion) => [criterion.id, criterion])
  );
  if (active.size === 0) {
    throw new AppError('No assessment criteria have been set up yet', 409);
  }
  if (submit && !form.confirmed_at) {
    throw new AppError(
      'The assessment form has not been confirmed by the Coordinator yet, so it cannot be submitted',
      409
    );
  }

  const parsed = new Map();
  for (const item of scores) {
    if (!item || item.marks === '' || item.marks === null || item.marks === undefined) {
      continue;
    }
    const criterion = active.get(item.criterionId);
    if (!criterion) {
      throw new AppError('One of the criteria is not part of the current form', 400);
    }
    const marks = parseNumber(item.marks, criterion.label, 0, criterion.max_marks);
    parsed.set(criterion.id, {
      criterion,
      marks,
      remark: optionalString(item.remark, { max: 500 }),
    });
  }

  if (submit) {
    const missing = Array.from(active.keys()).filter((id) => !parsed.has(id));
    if (missing.length > 0) {
      throw new AppError('Score every criterion before submitting', 400);
    }
  }

  const { rows: assessmentRows } = await db.query(
    `INSERT INTO assessments (student_id, kind, assessor_user_id, comments, status)
     VALUES ($1, 'industry', $2, $3, 'draft')
     ON CONFLICT (student_id, kind)
     DO UPDATE SET assessor_user_id = EXCLUDED.assessor_user_id,
                   comments = EXCLUDED.comments,
                   updated_at = now()
     WHERE assessments.status = 'draft'
     RETURNING *`,
    [studentId, userId, cleanComments]
  );

  if (assessmentRows.length === 0) {
    throw new AppError('This assessment has been submitted and can no longer be changed', 409);
  }
  const assessment = assessmentRows[0];

  const entries = Array.from(parsed.values());
  if (entries.length > 0) {
    await db.query(
      `INSERT INTO assessment_scores (assessment_id, criterion_id, label, max_marks, marks, remark)
       SELECT $1, x.criterion_id, x.label, x.max_marks, x.marks, x.remark
       FROM unnest($2::uuid[], $3::text[], $4::numeric[], $5::numeric[], $6::text[])
            AS x(criterion_id, label, max_marks, marks, remark)
       ON CONFLICT (assessment_id, criterion_id)
       DO UPDATE SET label = EXCLUDED.label,
                     max_marks = EXCLUDED.max_marks,
                     marks = EXCLUDED.marks,
                     remark = EXCLUDED.remark`,
      [
        assessment.id,
        entries.map((entry) => entry.criterion.id),
        entries.map((entry) => entry.criterion.label),
        entries.map((entry) => entry.criterion.max_marks),
        entries.map((entry) => entry.marks),
        entries.map((entry) => entry.remark),
      ]
    );
  }

  if (!submit) {
    return getIndustryAssessment(studentId, supervisorContext);
  }

  await db.query(
    `DELETE FROM assessment_scores
     WHERE assessment_id = $1 AND NOT (criterion_id = ANY($2::uuid[]))`,
    [assessment.id, Array.from(active.keys())]
  );

  const { rows: submitted } = await db.query(
    `UPDATE assessments
     SET status = 'submitted',
         submitted_at = now(),
         total_marks = (SELECT COALESCE(SUM(marks), 0) FROM assessment_scores WHERE assessment_id = $1),
         max_total = (SELECT COALESCE(SUM(max_marks), 0) FROM assessment_scores WHERE assessment_id = $1),
         updated_at = now()
     WHERE id = $1 AND status = 'draft'
     RETURNING id`,
    [assessment.id]
  );

  if (submitted.length === 0) {
    throw new AppError('This assessment has already been submitted', 409);
  }

  await notifyAssessmentSubmitted(studentId);
  return getIndustryAssessment(studentId, supervisorContext);
}

module.exports = {
  listForms,
  updateFormSettings,
  addCriterion,
  updateCriterion,
  deleteCriterion,
  confirmForm,
  listIndustryStudents,
  getIndustryAssessment,
  saveIndustryAssessment,
};