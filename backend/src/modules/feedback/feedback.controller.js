const feedbackService = require('./feedback.service');
const asyncHandler = require('../../utils/asyncHandler');
const resolveSupervisorContext = require('../../utils/resolveSupervisorContext');

const create = asyncHandler(async (req, res) => {
  const supervisorContext = await resolveSupervisorContext(req.user);
  const record = await feedbackService.createFeedback({
    industrySupervisorId: supervisorContext.id,
    studentId: req.body.studentId,
    content: req.body.content,
    flaggedConcern: req.body.flaggedConcern,
  });
  res.status(201).json({ success: true, data: record });
});

const listForStudent = asyncHandler(async (req, res) => {
  let requester = { role: req.user.role, id: req.user.id };

  if (req.user.role !== 'student') {
    const supervisorContext = await resolveSupervisorContext(req.user);
    requester.supervisorId = supervisorContext.id;
  }

  const records = await feedbackService.listForStudent(req.params.studentId, requester);
  res.status(200).json({ success: true, data: records });
});

module.exports = { create, listForStudent };
