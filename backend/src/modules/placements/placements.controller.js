const placementsService = require('./placements.service');
const asyncHandler = require('../../utils/asyncHandler');

const overview = asyncHandler(async (req, res) => {
  const rows = await placementsService.listOverview();
  res.status(200).json({ success: true, data: rows });
});

const allocate = asyncHandler(async (req, res) => {
  const placement = await placementsService.allocate({
    studentId: req.body.studentId,
    companyId: req.body.companyId,
    preferenceNote: req.body.preferenceNote,
    allocatedBy: req.user.id,
  });
  res.status(200).json({ success: true, data: placement });
});

const removeAllocation = asyncHandler(async (req, res) => {
  const placement = await placementsService.removeAllocation(req.params.studentId);
  res.status(200).json({ success: true, data: placement });
});

const confirm = asyncHandler(async (req, res) => {
  const placement = await placementsService.confirm({
    placementId: req.params.placementId,
    confirmedBy: req.user.id,
  });
  res.status(200).json({ success: true, data: placement });
});

const confirmAll = asyncHandler(async (req, res) => {
  const result = await placementsService.confirmAll({ confirmedBy: req.user.id });
  res.status(200).json({ success: true, data: result });
});

module.exports = { overview, allocate, removeAllocation, confirm, confirmAll };