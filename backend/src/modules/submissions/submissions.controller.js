const submissionsService = require('./submissions.service');
const asyncHandler = require('../../utils/asyncHandler');
const resolveSupervisorContext = require('../../utils/resolveSupervisorContext');

const create = asyncHandler(async (req, res) => {
  const submission = await submissionsService.createSubmission({
    studentUserId: req.user.id,
    file: req.file,
    clientUuid: req.body.clientUuid,
  });
  res.status(201).json({ success: true, data: submission });
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

module.exports = { create, listMine, listForStudent };
