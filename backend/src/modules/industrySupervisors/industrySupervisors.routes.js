const express = require('express');
const industrySupervisorsController = require('./industrySupervisors.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

router.post('/students', auth, requireRole('industry_supervisor'), industrySupervisorsController.addStudent);
router.get('/students', auth, requireRole('industry_supervisor'), industrySupervisorsController.listStudents);

module.exports = router;
