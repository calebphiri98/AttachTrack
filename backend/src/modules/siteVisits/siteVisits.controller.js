const service = require('./siteVisits.service');
const asyncHandler = require('../../utils/asyncHandler');
const resolveSupervisorContext = require('../../utils/resolveSupervisorContext');

const createVisit = asyncHandler(async (req, res) => {
  const data = await service.createVisit({ userId: req.user.id, ...req.body, file: req.file });
  res.status(201).json({ success: true, data });
});
const scheduleVisit = asyncHandler(async (req, res) => {
  const data = await service.scheduleVisit({ userId: req.user.id, ...req.body });
  res.status(201).json({ success: true, data });
});
const completeVisit = asyncHandler(async (req, res) => {
  const data = await service.completeVisit({ userId: req.user.id, visitId: req.params.visitId, ...req.body, file: req.file });
  res.status(200).json({ success: true, data });
});
const listForStudent = asyncHandler(async (req, res) => {
  const context = await resolveSupervisorContext(req.user);
  const data = await service.listForStudent(req.params.studentId, {
    role: req.user.role, id: req.user.id, supervisorId: context?.id || null,
  });
  res.status(200).json({ success: true, data });
});
module.exports = { createVisit, scheduleVisit, completeVisit, listForStudent };
