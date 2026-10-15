const express = require('express');
const placementsController = require('./placements.controller');
const placementsMine = require('./placements.mine');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

router.get('/overview', auth, requireRole('admin', 'hod'), placementsController.overview);
router.get('/mine', auth, requireRole('student'), placementsMine.getMine);
router.post('/', auth, requireRole('admin'), placementsController.allocate);
router.delete('/student/:studentId', auth, requireRole('admin'), placementsController.removeAllocation);
router.post('/confirm-all', auth, requireRole('hod'), placementsController.confirmAll);
router.post('/:placementId/confirm', auth, requireRole('hod'), placementsController.confirm);

module.exports = router;