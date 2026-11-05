const asyncHandler = require('../../utils/asyncHandler');
const monitorService = require('./attendance.monitor.service');

const overview = asyncHandler(async (req, res) => {
  const data = await monitorService.getOverview(req.user, req.query.days);
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).json({ success: true, data });
});

module.exports = { overview };
