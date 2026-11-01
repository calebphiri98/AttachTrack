const express = require('express');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const controller = require('./announcements.controller');
const router = express.Router();
const permitted = requireRole('admin', 'student', 'industry_supervisor', 'university_supervisor');

router.get('/', auth, permitted, controller.list);
router.post('/', auth, requireRole('admin'), controller.create);
router.get('/:id/replies', auth, permitted, controller.replies);
router.post('/:id/replies', auth, permitted, controller.reply);

module.exports = router;
