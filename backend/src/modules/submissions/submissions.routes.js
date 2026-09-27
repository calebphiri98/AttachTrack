const express = require('express');
const submissionsController = require('./submissions.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const upload = require('../../middleware/upload');

const router = express.Router();

router.post('/', auth, requireRole('student'), upload.single('file'), submissionsController.create);
router.get('/mine', auth, requireRole('student'), submissionsController.listMine);
router.get(
  '/student/:studentId',
  auth,
  requireRole('industry_supervisor', 'university_supervisor'),
  submissionsController.listForStudent
);

router.post(
  '/requirements',
  auth,
  requireRole('industry_supervisor', 'university_supervisor'),
  submissionsController.createRequirement
);
router.post(
  '/:id/fulfill',
  auth,
  requireRole('student'),
  upload.single('file'),
  submissionsController.fulfill
);
router.post(
  '/:id/reopen',
  auth,
  requireRole('industry_supervisor', 'university_supervisor'),
  submissionsController.reopen
);

module.exports = router;
