const express = require('express');
const gradesController = require('./grades.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

router.post('/', auth, requireRole('university_supervisor'), gradesController.assign);

router.get('/overview', auth, requireRole('admin', 'hod'), gradesController.overview);
router.post('/release-all', auth, requireRole('admin', 'hod'), gradesController.releaseAll);
router.post('/:studentId/release', auth, requireRole('admin', 'hod'), gradesController.release);

router.get(
  '/student/:studentId',
  auth,
  requireRole('student', 'university_supervisor'),
  gradesController.getForStudent
);

module.exports = router;