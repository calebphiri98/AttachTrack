const express = require('express');
const assessmentsController = require('./assessments.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const AppError = require('../../utils/AppError');

const router = express.Router();

const KIND_ROLE = {
  industry: 'industry_supervisor',
  university: 'university_supervisor',
};

function requireKindRole(req, res, next) {
  const role = KIND_ROLE[req.params.kind];
  if (!role) {
    return next(new AppError('Unknown assessment type', 404));
  }
  if (!req.user || req.user.role !== role) {
    return next(new AppError('You do not have permission to do this', 403));
  }
  return next();
}

router.get('/forms', auth, requireRole('admin', 'hod'), assessmentsController.listForms);
router.patch('/forms/:kind', auth, requireRole('admin'), assessmentsController.updateFormSettings);
router.post('/forms/:kind/criteria', auth, requireRole('admin'), assessmentsController.addCriterion);
router.post('/forms/:kind/confirm', auth, requireRole('admin'), assessmentsController.confirmForm);
router.patch('/criteria/:criterionId', auth, requireRole('admin'), assessmentsController.updateCriterion);
router.delete('/criteria/:criterionId', auth, requireRole('admin'), assessmentsController.deleteCriterion);

router.get('/:kind/students', auth, requireKindRole, assessmentsController.listStudents);
router.get('/:kind/students/:studentId', auth, requireKindRole, assessmentsController.getAssessment);
router.put('/:kind/students/:studentId', auth, requireKindRole, assessmentsController.saveAssessment);

module.exports = router;