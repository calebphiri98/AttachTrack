const submissionsService = require('./submissions.service');
const asyncHandler = require('../../utils/asyncHandler');
const resolveSupervisorContext = require('../../utils/resolveSupervisorContext');

const create = asyncHandler(async (req, res) => {
  const submission = await submissionsService.createSubmission({
    studentUserId: req.user.id,
    file: req.file,
    clientUuid: req.body.clientUuid,
    recipientRole: req.body.recipientRole,
  });
  res.status(201).json({ success: true, data: submission });
});

const createRequirement = asyncHandler(async (req, res) => {
  const supervisorContext = await resolveSupervisorContext(req.user);
  const requirement = await submissionsService.createRequirement({
    studentId: req.body.studentId,
    dueDate: req.body.dueDate,
    supervisorContext,
  });
  res.status(201).json({ success: true, data: requirement });
});

const fulfill = asyncHandler(async (req, res) => {
  const submission = await submissionsService.fulfillRequirement({
    submissionId: req.params.id,
    studentUserId: req.user.id,
    file: req.file,
  });
  res.status(200).json({ success: true, data: submission });
});

const reopen = asyncHandler(async (req, res) => {
  const supervisorContext = await resolveSupervisorContext(req.user);
  const submission = await submissionsService.reopenRequirement({
    submissionId: req.params.id,
    supervisorContext,
    reopenedByUserId: req.user.id,
    penaltyPercent: req.body.penaltyPercent,
  });
  res.status(200).json({ success: true, data: submission });
});

const listMine = asyncHandler(async (req, res) => {
  const submissions = await submissionsService.listMine(req.user.id);
  res.status(200).json({ success: true, data: submissions });
});

const listForStudent = asyncHandler(async (req, res) => {
  const supervisorContext = await resolveSupervisorContext(req.user);
  const submissions = await submissionsService.listForStudent(
    req.params.studentId,
    supervisorContext
  );
  res.status(200).json({ success: true, data: submissions });
});

module.exports = { create, createRequirement, fulfill, reopen, listMine, listForStudent };
