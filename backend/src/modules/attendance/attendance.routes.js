const express = require('express');
const attendanceController = require('./attendance.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const offlineSync = require('../../middleware/offlineSync');

const router = express.Router();

router.get('/students', auth, requireRole('industry_supervisor'), attendanceController.listMyStudents);
router.post('/', auth, requireRole('industry_supervisor'), offlineSync(), attendanceController.mark);
router.get(
  '/student/:studentId',
  auth,
  requireRole('student', 'industry_supervisor', 'university_supervisor', 'admin', 'hod'),
  attendanceController.listForStudent
);

module.exports = router;

