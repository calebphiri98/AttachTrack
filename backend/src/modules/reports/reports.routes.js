const express = require('express');
const reportsController = require('./reports.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

router.get('/student/:studentId', auth, requireRole('student', 'industry_supervisor', 'university_supervisor'), reportsController.exportStudentReport);
router.get('/cohort', auth, requireRole('admin'), reportsController.exportCohortReport);

module.exports = router;
