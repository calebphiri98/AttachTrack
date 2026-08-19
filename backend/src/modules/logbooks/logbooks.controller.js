const logbooksService = require('./logbooks.service');
const asyncHandler = require('../../utils/asyncHandler');
const resolveSupervisorContext = require('../../utils/resolveSupervisorContext');

const listMine = asyncHandler(async (req, res) => {
  const entries = await logbooksService.listMine(req.user.id);
  res.status(200).json({ success: true, data: entries });
});

const createEntry = asyncHandler(async (req, res) => {
  const entry = await logbooksService.createEntry({
    userId: req.user.id,
    entryDate: req.body.entryDate,
    activity: req.body.activity,
    notes: req.body.notes,
    file: req.file,
  });

  res.status(201).json({ success: true, data: entry });
});

const listForStudent = asyncHandler(async (req, res) => {
  let requester = { role: req.user.role, id: req.user.id };

  if (req.user.role !== 'student') {
    const supervisorContext = await resolveSupervisorContext(req.user);
    requester.supervisorId = supervisorContext.id;
  }

  const entries = await logbooksService.listForStudent(req.params.studentId, requester);

  res.status(200).json({ success: true, data: entries });
});

module.exports = { listMine, createEntry, listForStudent };
