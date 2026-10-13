const assessmentsService = require('./assessments.service');
const asyncHandler = require('../../utils/asyncHandler');
const resolveSupervisorContext = require('../../utils/resolveSupervisorContext');

const listForms = asyncHandler(async (req, res) => {
  const forms = await assessmentsService.listForms();
  res.status(200).json({ success: true, data: forms });
});

const updateFormSettings = asyncHandler(async (req, res) => {
  const form = await assessmentsService.updateFormSettings(req.params.kind, {
    title: req.body.title,
    weightPercent: req.body.weightPercent,
  });
  res.status(200).json({ success: true, data: form });
});

const addCriterion = asyncHandler(async (req, res) => {
  const form = await assessmentsService.addCriterion(req.params.kind, {
    label: req.body.label,
    description: req.body.description,
    maxMarks: req.body.maxMarks,
  });
  res.status(201).json({ success: true, data: form });
});

const updateCriterion = asyncHandler(async (req, res) => {
  const form = await assessmentsService.updateCriterion(req.params.criterionId, {
    label: req.body.label,
    description: req.body.description,
    maxMarks: req.body.maxMarks,
    isActive: req.body.isActive,
  });
  res.status(200).json({ success: true, data: form });
});

const deleteCriterion = asyncHandler(async (req, res) => {
  const form = await assessmentsService.deleteCriterion(req.params.criterionId);
  res.status(200).json({ success: true, data: form });
});

const confirmForm = asyncHandler(async (req, res) => {
  const form = await assessmentsService.confirmForm(req.params.kind, req.user.id);
  res.status(200).json({ success: true, data: form });
});

const listIndustryStudents = asyncHandler(async (req, res) => {
  const supervisorContext = await resolveSupervisorContext(req.user);
  const students = await assessmentsService.listIndustryStudents(supervisorContext);
  res.status(200).json({ success: true, data: students });
});

const getIndustryAssessment = asyncHandler(async (req, res) => {
  const supervisorContext = await resolveSupervisorContext(req.user);
  const result = await assessmentsService.getIndustryAssessment(
    req.params.studentId,
    supervisorContext
  );
  res.status(200).json({ success: true, data: result });
});

const saveIndustryAssessment = asyncHandler(async (req, res) => {
  const supervisorContext = await resolveSupervisorContext(req.user);
  const result = await assessmentsService.saveIndustryAssessment({
    studentId: req.params.studentId,
    supervisorContext,
    userId: req.user.id,
    scores: req.body.scores,
    comments: req.body.comments,
    submit: req.body.submit === true,
  });
  res.status(200).json({ success: true, data: result });
});

module.exports = {
  listForms,
  updateFormSettings,
  addCriterion,
  updateCriterion,
  deleteCriterion,
  confirmForm,
  listIndustryStudents,
  getIndustryAssessment,
  saveIndustryAssessment,
};