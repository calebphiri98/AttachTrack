const attendanceService = require('./attendance.service');
const asyncHandler = require('../../utils/asyncHandler');
const resolveSupervisorContext = require('../../utils/resolveSupervisorContext');

const mark = asyncHandler(async (req, res) => {
  const supervisorContext = await resolveSupervisorContext(req.user);

  const result = await attendanceService.markAttendance({
    supervisorContext,
    userId: req.user.id,
    studentId: req.body.studentId,
    dateFrom: req.body.dateFrom,
    dateTo: req.body.dateTo,
    status: req.body.status,
    reason: req.body.reason,
    notes: req.body.notes,
    weekdaysOnly: req.body.weekdaysOnly !== false,
  });

  res.status(201).json({ success: true, data: result });
});

const listForStudent = asyncHandler(async (req, res) => {
  const requester = { role: req.user.role, id: req.user.id };

  if (req.user.role !== 'student') {
    const supervisorContext = await resolveSupervisorContext(req.user);
    if (supervisorContext) {
      requester.supervisorId = supervisorContext.id;
    }
  }

  const records = await attendanceService.listForStudent(
    req.params.studentId,
    requester,
    req.query.limit
  );
  res.status(200).json({ success: true, data: records });
});

const listMyStudents = asyncHandler(async (req, res) => {
  const supervisorContext = await resolveSupervisorContext(req.user);
  const data = await attendanceService.listMyStudents(supervisorContext);
  res.status(200).json({ success: true, data });
});

module.exports = { mark, listForStudent, listMyStudents };