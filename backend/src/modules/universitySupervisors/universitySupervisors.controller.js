const universitySupervisorsService = require('./universitySupervisors.service');
const asyncHandler = require('../../utils/asyncHandler');

const addStudent = asyncHandler(async (req, res) => {
  const student = await universitySupervisorsService.addStudent(req.user.id, req.body);
  res.status(201).json({ success: true, data: student });
});

const listStudents = asyncHandler(async (req, res) => {
  const students = await universitySupervisorsService.listStudents(req.user.id);
  res.status(200).json({ success: true, data: students });
});

module.exports = { addStudent, listStudents };
