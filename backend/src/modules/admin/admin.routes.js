const express = require('express');
const adminController = require('./admin.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

router.get('/dashboard', auth, requireRole('admin'), adminController.getDashboard);
router.get('/students', auth, requireRole('admin'), adminController.listStudents);
router.patch('/students/:studentId/supervisors', auth, requireRole('admin'), adminController.assignStudentSupervisors);
router.post('/users', auth, requireRole('admin'), adminController.createAccount);

module.exports = router;
