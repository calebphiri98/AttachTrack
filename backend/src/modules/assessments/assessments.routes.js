const express = require('express');
const assessmentsController = require('./assessments.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

router.get('/forms', auth, requireRole('admin', 'hod'), assessmentsController.listForms);
router.patch('/forms/:kind', auth, requireRole('admin'), assessmentsController.updateFormSettings);
router.post('/forms/:kind/criteria', auth, requireRole('admin'), assessmentsController.addCriterion);
router.post('/forms/:kind/confirm', auth, requireRole('admin'), assessmentsController.confirmForm);
router.patch('/criteria/:criterionId', auth, requireRole('admin'), assessmentsController.updateCriterion);
router.delete('/criteria/:criterionId', auth, requireRole('admin'), assessmentsController.deleteCriterion);

router.get(
  '/industry/students',
  auth,
  requireRole('industry_supervisor'),
  assessmentsController.listIndustryStudents
);
router.get(
  '/industry/students/:studentId',
  auth,
  requireRole('industry_supervisor'),
  assessmentsController.getIndustryAssessment
);
router.put(
  '/industry/students/:studentId',
  auth,
  requireRole('industry_supervisor'),
  assessmentsController.saveIndustryAssessment
);

module.exports = router;