const gradesService = require('./grades.service');
const asyncHandler = require('../../utils/asyncHandler');
const resolveSupervisorContext = require('../../utils/resolveSupervisorContext');

const assign = asyncHandler(async (req, res) => {
  const supervisorContext = await resolveSupervisorContext(req.user);
  const record = await gradesService.assignGrade({
    universitySupervisorId: supervisorContext.id,
    studentId: req.body.studentId,
    gradeValue: req.body.gradeValue,
    comments: req.body.comments,
  });
  res.status(201).json({ success: true, data: record });
});

const getForStudent = asyncHandler(async (req, res) => {
  let requester = { role: req.user.role, id: req.user.id };

  if (req.user.role !== 'student') {
    const supervisorContext = await resolveSupervisorContext(req.user);
    requester.supervisorId = supervisorContext.id;
  }

  const record = await gradesService.getForStudent(req.params.studentId, requester);
  res.status(200).json({ success: true, data: record });
});

module.exports = { assign, getForStudent };
