const tempSupervisorsService = require('./tempSupervisors.service');
const asyncHandler = require('../../utils/asyncHandler');
const resolveSupervisorContext = require('../../utils/resolveSupervisorContext');

const assign = asyncHandler(async (req, res) => {
  const assignment = await tempSupervisorsService.assign({
    userId: req.user.id,
    studentId: req.body.studentId,
    industrySupervisorId: req.body.industrySupervisorId,
    department: req.body.department,
  });

  res.status(201).json({ success: true, data: assignment });
});

const end = asyncHandler(async (req, res) => {
  const assignment = await tempSupervisorsService.end({
    userId: req.user.id,
    studentId: req.body.studentId,
  });

  res.status(200).json({ success: true, data: assignment });
});

const getCurrentForStudent = asyncHandler(async (req, res) => {
  const supervisorContext = await resolveSupervisorContext(req.user);
  const current = await tempSupervisorsService.getCurrent(req.params.studentId, {
    role: req.user.role,
    id: req.user.id,
    supervisorId: supervisorContext ? supervisorContext.id : null,
  });
  res.status(200).json({ success: true, data: current });
});

const listHistoryForStudent = asyncHandler(async (req, res) => {
  const supervisorContext = await resolveSupervisorContext(req.user);
  const history = await tempSupervisorsService.listHistory(req.params.studentId, {
    role: req.user.role,
    id: req.user.id,
    supervisorId: supervisorContext ? supervisorContext.id : null,
  });
  res.status(200).json({ success: true, data: history });
});

module.exports = { assign, end, getCurrentForStudent, listHistoryForStudent };
