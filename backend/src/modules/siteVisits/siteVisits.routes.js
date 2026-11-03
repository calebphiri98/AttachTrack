const express = require('express');
const multer = require('multer');
const controller = require('./siteVisits.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const offlineSync = require('../../middleware/offlineSync');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
router.post('/schedule', auth, requireRole('university_supervisor'), controller.scheduleVisit);
router.patch('/:visitId/complete', auth, requireRole('university_supervisor'), upload.single('photo'), controller.completeVisit);
router.post('/', auth, requireRole('university_supervisor'), upload.single('photo'), offlineSync({ table: 'site_visits' }), controller.createVisit);
router.get('/student/:studentId', auth, requireRole('student', 'university_supervisor', 'industry_supervisor'), controller.listForStudent);
module.exports = router;
