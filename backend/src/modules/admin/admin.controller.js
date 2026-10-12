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

const listSupervisors = asyncHandler(async (req, res) => {
  const supervisors = await adminService.listSupervisors();
  res.status(200).json({ success: true, data: supervisors });
});

const assignStudentSupervisors = asyncHandler(async (req, res) => {
  const result = await adminService.assignStudentSupervisors({
    studentId: req.params.studentId,
    industrySupervisorId: req.body.industrySupervisorId,
    universitySupervisorId: req.body.universitySupervisorId,
  });

  res.status(200).json({ success: true, data: result });
});

const createAccount = asyncHandler(async (req, res) => {
  const result = await adminService.createAccount({
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
  });

  res.status(201).json({ success: true, data: result });
});

const listUsers = asyncHandler(async (req, res) => {
  const users = await adminService.listUsers();
  res.status(200).json({ success: true, data: users });
});

const setUserActive = asyncHandler(async (req, res) => {
  const user = await adminService.setUserActive({
    userId: req.params.userId,
    isActive: req.body.isActive,
    actingUserId: req.user.id,
  });

  res.status(200).json({ success: true, data: user });
});

module.exports = {
  listStudents,
  getDashboard,
  listSupervisors,
  assignStudentSupervisors,
  createAccount,
  listUsers,
  setUserActive,
};