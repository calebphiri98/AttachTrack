const express = require('express');
const messagesController = require('./messages.controller');
const auth = require('../../middleware/auth');
const upload = require('../../middleware/upload');
const offlineSync = require('../../middleware/offlineSync');

const router = express.Router();

router.post('/', auth, upload.single('file'), offlineSync({ table: 'messages' }), messagesController.send);
router.get('/threads', auth, messagesController.threads);
router.get('/thread/:userId', auth, messagesController.thread);
router.get('/contacts', auth, messagesController.contacts);
router.patch('/:id/read', auth, messagesController.markRead);

module.exports = router;

