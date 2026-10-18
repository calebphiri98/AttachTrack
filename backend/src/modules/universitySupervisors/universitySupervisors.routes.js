const express = require('express');
const universitySupervisorsController = require('./universitySupervisors.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

router.get(
  '/students',
  auth,
  requireRole('university_supervisor'),
  universitySupervisorsController.listStudents
);

module.exports = router;
