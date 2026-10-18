const logbooksService = require('./logbooks.service');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');
const resolveSupervisorContext = require('../../utils/resolveSupervisorContext');

function parseFields(body) {
  return {
    entryDate: body.entryDate,
    startTime: body.startTime,
    endTime: body.endTime,
    activity: body.activity,
    description: body.description,
    skillsLearned: body.skillsLearned,
    challenges: body.challenges,
    toolsUsed: body.toolsUsed,
  };
}

function parseRemoveIds(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error('not a list');
    return parsed;
  } catch (err) {
    throw new AppError('removeFileIds must be a list', 400);
  }
}

const listMine = asyncHandler(async (req, res) => {
  const entries = await logbooksService.listMine(req.user.id);
  res.status(200).json({ success: true, data: entries });
});

const createEntry = asyncHandler(async (req, res) => {
  const entry = await logbooksService.createEntry({
    userId: req.user.id,
    fields: parseFields(req.body),
    files: req.files || [],
    submit: req.body.submit === 'true',
    clientUuid: req.body.clientUuid || null,
  });

  res.status(201).json({ success: true, data: entry });
});

const updateEntry = asyncHandler(async (req, res) => {
  const entry = await logbooksService.updateEntry({
    userId: req.user.id,
    entryId: req.params.entryId,
    fields: parseFields(req.body),
    files: req.files || [],
    removeFileIds: parseRemoveIds(req.body.removeFileIds),
    submit: req.body.submit === 'true',
  });

  res.status(200).json({ success: true, data: entry });
});

const addFiles = asyncHandler(async (req, res) => {
  const entry = await logbooksService.addFiles({
    userId: req.user.id,
    entryId: req.params.entryId,
    files: req.files || [],
  });
  res.status(200).json({ success: true, data: entry });
});

const deleteEntry = asyncHandler(async (req, res) => {
  const result = await logbooksService.deleteEntry({
    userId: req.user.id,
    entryId: req.params.entryId,
  });
  res.status(200).json({ success: true, data: result });
});

const submitEntry = asyncHandler(async (req, res) => {
  const entry = await logbooksService.submitEntry({
    userId: req.user.id,
    entryId: req.params.entryId,
  });
  res.status(200).json({ success: true, data: entry });
});

const submitWeek = asyncHandler(async (req, res) => {
  const result = await logbooksService.submitWeek({
    userId: req.user.id,
    weekStart: req.params.weekStart,
  });
  res.status(200).json({ success: true, data: result });
});

const listForStudent = asyncHandler(async (req, res) => {
  const supervisorContext = await resolveSupervisorContext(req.user);
  const entries = await logbooksService.listForStudent(req.params.studentId, {
    role: req.user.role,
    id: req.user.id,
    supervisorId: supervisorContext ? supervisorContext.id : null,
  });

  res.status(200).json({ success: true, data: entries });
});

const reviewWeek = asyncHandler(async (req, res) => {
  const supervisorContext = await resolveSupervisorContext(req.user);
  const result = await logbooksService.reviewWeek({
    supervisorContext,
    userId: req.user.id,
    studentId: req.params.studentId,
    weekStart: req.params.weekStart,
    decision: req.body.decision,
    comment: req.body.comment,
  });

  res.status(200).json({ success: true, data: result });
});

module.exports = {
  listMine,
  createEntry,
  updateEntry,
  addFiles,
  deleteEntry,
  submitEntry,
  submitWeek,
  listForStudent,
  reviewWeek,
};

