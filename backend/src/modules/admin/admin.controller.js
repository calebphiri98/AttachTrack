const adminService = require('./admin.service');
const asyncHandler = require('../../utils/asyncHandler');

const listStudents = asyncHandler(async (req, res) => {
  const students = await adminService.listStudents();
  res.status(200).json({ success: true, data: students });
});

const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await adminService.getDashboard();
  res.status(200).json({ success: true, data: dashboard });
});

const assignStudentSupervisors = asyncHandler(async (req, res) => {
  const result = await adminService.assignStudentSupervisors({
    studentId: req.params.studentId,
    industrySupervisorId: req.body.industrySupervisorId,
    universitySupervisorId: req.body.universitySupervisorId,
  });

  res.status(200).json({ success: true, data: result });
});

module.exports = { listStudents, getDashboard, assignStudentSupervisors };
