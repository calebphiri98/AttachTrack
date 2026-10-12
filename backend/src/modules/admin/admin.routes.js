const express = require('express');
const adminController = require('./admin.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

router.get('/dashboard', auth, requireRole('admin', 'hod'), adminController.getDashboard);
router.get('/students', auth, requireRole('admin', 'hod'), adminController.listStudents);
router.get('/supervisors', auth, requireRole('admin'), adminController.listSupervisors);
router.patch('/students/:studentId/supervisors', auth, requireRole('admin'), adminController.assignStudentSupervisors);
router.post('/users', auth, requireRole('admin'), adminController.createAccount);
router.get('/users', auth, requireRole('admin'), adminController.listUsers);
router.patch('/users/:userId/active', auth, requireRole('admin'), adminController.setUserActive);

module.exports = router;