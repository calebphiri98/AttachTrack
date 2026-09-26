const express = require('express');
const feedbackController = require('./feedback.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

router.post('/', auth, requireRole('industry_supervisor'), feedbackController.create);
router.get(
  '/student/:studentId',
  auth,
  requireRole('student', 'industry_supervisor', 'university_supervisor'),
  feedbackController.listForStudent
);

module.exports = router;
