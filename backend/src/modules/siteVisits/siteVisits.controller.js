const siteVisitsService = require('./siteVisits.service');
const asyncHandler = require('../../utils/asyncHandler');
const resolveSupervisorContext = require('../../utils/resolveSupervisorContext');

const createVisit = asyncHandler(async (req, res) => {
  const visit = await siteVisitsService.createVisit({
    userId: req.user.id,
    studentId: req.body.studentId,
    visitDate: req.body.visitDate,
    notes: req.body.notes,
    file: req.file,
  });

  res.status(201).json({ success: true, data: visit });
});

const listForStudent = asyncHandler(async (req, res) => {
  const supervisorContext = await resolveSupervisorContext(req.user);
  const visits = await siteVisitsService.listForStudent(req.params.studentId, {
    role: req.user.role,
    id: req.user.id,
    supervisorId: supervisorContext ? supervisorContext.id : null,
  });

  res.status(200).json({ success: true, data: visits });
});

module.exports = { createVisit, listForStudent };