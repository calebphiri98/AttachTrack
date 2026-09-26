const express = require('express');
const attendanceController = require('./attendance.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

router.post('/', auth, requireRole('industry_supervisor'), attendanceController.mark);
router.get(
  '/student/:studentId',
  auth,
  requireRole('student', 'industry_supervisor', 'university_supervisor'),
  attendanceController.listForStudent
);

module.exports = router;
