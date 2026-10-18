const industrySupervisorsService = require('./industrySupervisors.service');
const asyncHandler = require('../../utils/asyncHandler');

const listStudents = asyncHandler(async (req, res) => {
  const students = await industrySupervisorsService.listStudents(req.user.id);
  res.status(200).json({ success: true, data: students });
});

const listAll = asyncHandler(async (req, res) => {
  const supervisors = await industrySupervisorsService.listAll();
  res.status(200).json({ success: true, data: supervisors });
});

module.exports = { listStudents, listAll };
