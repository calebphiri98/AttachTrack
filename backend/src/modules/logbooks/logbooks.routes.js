const express = require('express');
const multer = require('multer');
const logbooksController = require('./logbooks.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/me', auth, requireRole('student'), logbooksController.listMine);
router.post('/me', auth, requireRole('student'), upload.single('file'), logbooksController.createEntry);
router.get('/student/:studentId', auth, requireRole('student', 'industry_supervisor', 'university_supervisor'), logbooksController.listForStudent);

module.exports = router;
