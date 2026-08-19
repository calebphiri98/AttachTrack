const reportsService = require('./reports.service');
const asyncHandler = require('../../utils/asyncHandler');
const resolveSupervisorContext = require('../../utils/resolveSupervisorContext');

const exportStudentReport = asyncHandler(async (req, res) => {
  let requester = { role: req.user.role, id: req.user.id };

  if (req.user.role !== 'student') {
    const supervisorContext = await resolveSupervisorContext(req.user);
    requester.supervisorId = supervisorContext.id;
  }

  const csv = await reportsService.generateStudentCsv(req.params.studentId, requester);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="student-report-${req.params.studentId}.csv"`);
  res.status(200).send(csv);
});

const exportCohortReport = asyncHandler(async (req, res) => {
  const csv = await reportsService.generateCohortCsv({ role: req.user.role });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="cohort-report.csv"');
  res.status(200).send(csv);
});

module.exports = { exportStudentReport, exportCohortReport };
