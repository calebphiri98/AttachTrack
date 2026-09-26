const attendanceService = require('./attendance.service');
const asyncHandler = require('../../utils/asyncHandler');
const resolveSupervisorContext = require('../../utils/resolveSupervisorContext');

const mark = asyncHandler(async (req, res) => {
  const supervisorContext = await resolveSupervisorContext(req.user);
  const record = await attendanceService.markAttendance({
    industrySupervisorId: supervisorContext.id,
    studentId: req.body.studentId,
    weekStartDate: req.body.weekStartDate,
    status: req.body.status,
    notes: req.body.notes,
  });
  res.status(201).json({ success: true, data: record });
});

const listForStudent = asyncHandler(async (req, res) => {
  let requester = { role: req.user.role, id: req.user.id };

  if (req.user.role !== 'student') {
    const supervisorContext = await resolveSupervisorContext(req.user);
    requester.supervisorId = supervisorContext.id;
  }

  const records = await attendanceService.listForStudent(req.params.studentId, requester);
  res.status(200).json({ success: true, data: records });
});

module.exports = { mark, listForStudent };
