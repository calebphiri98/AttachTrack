const express = require('express');
const multer = require('multer');
const siteVisitsController = require('./siteVisits.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', auth, requireRole('university_supervisor'), upload.single('photo'), siteVisitsController.createVisit);
router.get('/student/:studentId', auth, requireRole('student', 'university_supervisor'), siteVisitsController.listForStudent);

module.exports = router;
