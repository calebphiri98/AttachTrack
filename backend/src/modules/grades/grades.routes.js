const express = require('express');
const gradesController = require('./grades.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

router.post('/', auth, requireRole('university_supervisor'), gradesController.assign);
router.get(
  '/student/:studentId',
  auth,
  requireRole('student', 'industry_supervisor', 'university_supervisor'),
  gradesController.getForStudent
);

module.exports = router;
