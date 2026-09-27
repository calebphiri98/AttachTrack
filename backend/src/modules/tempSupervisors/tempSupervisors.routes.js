const express = require('express');
const tempSupervisorsController = require('./tempSupervisors.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

// Only the university supervisor assigns/ends temp supervisors — matches
// the requirement that this responsibility sits with the university
// supervisor, not the admin or the industry supervisor.
router.post('/assign', auth, requireRole('university_supervisor'), tempSupervisorsController.assign);
router.post('/end', auth, requireRole('university_supervisor'), tempSupervisorsController.end);

router.get(
  '/student/:studentId',
  auth,
  requireRole('student', 'university_supervisor'),
  tempSupervisorsController.getCurrentForStudent
);
router.get(
  '/student/:studentId/history',
  auth,
  requireRole('student', 'university_supervisor'),
  tempSupervisorsController.listHistoryForStudent
);

module.exports = router;
