const express = require('express');
const notificationsController = require('./notifications.controller');
const auth = require('../../middleware/auth');

const router = express.Router();

router.get('/', auth, notificationsController.list);
router.patch('/:id/read', auth, notificationsController.markRead);

module.exports = router;
