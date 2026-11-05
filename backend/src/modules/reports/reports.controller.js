const reportsService = require('./reports.service');
const reportFormat = require('./reports.format');
const asyncHandler = require('../../utils/asyncHandler');
const resolveSupervisorContext = require('../../utils/resolveSupervisorContext');
const AppError = require('../../utils/AppError');

function getFormat(req) {
  const format = req.query.format || 'csv';
  if (typeof format !== 'string' || !reportFormat.SUPPORTED_FORMATS.includes(format)) {
    throw new AppError('Report format must be csv, pdf or docx', 400);
  }
  return format;
}

async function sendReport(res, csv, kind, baseName, format) {
  const content = await reportFormat.renderReport(csv, kind, format);
  res.setHeader('Content-Type', reportFormat.MIME_TYPES[format]);
  res.setHeader('Content-Disposition', `attachment; filename="${baseName}.${format}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(200).send(content);
}

const exportStudentReport = asyncHandler(async (req, res) => {
  const format = getFormat(req);
  const supervisorContext = req.user.role === 'student'
    ? null
    : await resolveSupervisorContext(req.user);
  const csv = await reportsService.generateStudentCsv(req.params.studentId, {
    role: req.user.role,
    id: req.user.id,
    supervisorId: supervisorContext?.id || null,
  });
  await sendReport(res, csv, 'student', `student-report-${req.params.studentId}`, format);
});

const exportCohortReport = asyncHandler(async (req, res) => {
  const format = getFormat(req);
  const csv = await reportsService.generateCohortCsv({ role: req.user.role });
  await sendReport(res, csv, 'cohort', 'cohort-report', format);
});

module.exports = { exportStudentReport, exportCohortReport };
