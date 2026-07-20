const express = require('express');
const studentsController = require('./students.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

router.get('/me', auth, requireRole('student'), studentsController.getMyProfile);

module.exports = router;
