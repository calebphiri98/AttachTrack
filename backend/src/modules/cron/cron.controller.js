const cronService = require('./cron.service');
const asyncHandler = require('../../utils/asyncHandler');

const checkSubmissions = asyncHandler(async (req, res) => {
  const result = await cronService.checkMissedSubmissions();
  res.status(200).json({ success: true, data: result });
});

const checkAttendance = asyncHandler(async (req, res) => {
  const result = await cronService.checkMissedAttendance();
  res.status(200).json({ success: true, data: result });
});

module.exports = { checkSubmissions, checkAttendance };
