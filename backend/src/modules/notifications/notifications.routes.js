const express = require('express');
const notificationsController = require('./notifications.controller');
const auth = require('../../middleware/auth');

const router = express.Router();

router.get('/', auth, notificationsController.list);
router.get('/unread-count', auth, notificationsController.unreadCount);
router.get('/preferences', auth, notificationsController.getPreferences);
router.put('/preferences', auth, notificationsController.updatePreferences);
router.patch('/read-all', auth, notificationsController.markAllRead);
router.patch('/:id/read', auth, notificationsController.markRead);

module.exports = router;