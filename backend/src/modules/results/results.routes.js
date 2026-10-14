const express = require('express');
const resultsController = require('./results.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

router.get('/overview', auth, requireRole('admin'), resultsController.overview);
router.get('/hod', auth, requireRole('hod'), resultsController.hodResults);
router.get('/mine', auth, requireRole('student'), resultsController.mine);

router.post('/compile-all', auth, requireRole('admin'), resultsController.compileAll);
router.post('/send-to-hod', auth, requireRole('admin'), resultsController.sendToHod);
router.post('/approve-all', auth, requireRole('hod'), resultsController.approveAll);
router.post('/release-all', auth, requireRole('admin', 'hod'), resultsController.releaseAll);

router.post('/:studentId/compile', auth, requireRole('admin'), resultsController.compile);
router.post('/:studentId/remind', auth, requireRole('admin'), resultsController.remind);
router.post('/:resultId/approve', auth, requireRole('hod'), resultsController.approve);
router.post('/:resultId/release', auth, requireRole('admin', 'hod'), resultsController.release);

module.exports = router;