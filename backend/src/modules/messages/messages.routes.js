const express = require('express');
const messagesController = require('./messages.controller');
const auth = require('../../middleware/auth');
const upload = require('../../middleware/upload');

const router = express.Router();

// No requireRole here — all three roles can send/receive messages;
// who can message whom is enforced in messages.service.js.
router.post('/', auth, upload.single('file'), messagesController.send);
router.get('/threads', auth, messagesController.threads);
router.get('/thread/:userId', auth, messagesController.thread);
router.patch('/:id/read', auth, messagesController.markRead);

module.exports = router;