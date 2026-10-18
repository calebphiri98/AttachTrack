const universitySupervisorsService = require('./universitySupervisors.service');
const asyncHandler = require('../../utils/asyncHandler');

const listStudents = asyncHandler(async (req, res) => {
  const students = await universitySupervisorsService.listStudents(req.user.id);
  res.status(200).json({ success: true, data: students });
});

module.exports = { listStudents };
