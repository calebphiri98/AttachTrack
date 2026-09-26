const express = require('express');
const companiesController = require('./companies.controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');

const router = express.Router();

router.get('/', auth, requireRole('admin', 'industry_supervisor', 'university_supervisor'), companiesController.listCompanies);
router.post('/', auth, requireRole('admin'), companiesController.createCompany);
router.patch('/:companyId', auth, requireRole('admin'), companiesController.updateCompany);
router.patch('/me/company', auth, requireRole('industry_supervisor'), companiesController.assignMyCompany);

module.exports = router;
