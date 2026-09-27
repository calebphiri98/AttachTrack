const express = require('express');
const cronController = require('./cron.controller');
const cronAuth = require('../../middleware/cronAuth');

const router = express.Router();

router.get('/check-submissions', cronAuth, cronController.checkSubmissions);
router.get('/check-attendance', cronAuth, cronController.checkAttendance);

module.exports = router;
