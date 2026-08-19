const companiesService = require('./companies.service');
const asyncHandler = require('../../utils/asyncHandler');

const listCompanies = asyncHandler(async (req, res) => {
  const companies = await companiesService.listCompanies();
  res.status(200).json({ success: true, data: companies });
});

const createCompany = asyncHandler(async (req, res) => {
  const company = await companiesService.createCompany({
    name: req.body.name,
    address: req.body.address,
    industrySector: req.body.industrySector,
    mouStatus: req.body.mouStatus,
    mouDate: req.body.mouDate,
  });
  res.status(201).json({ success: true, data: company });
});

const updateCompany = asyncHandler(async (req, res) => {
  const company = await companiesService.updateCompany(req.params.companyId, {
    name: req.body.name,
    address: req.body.address,
    industrySector: req.body.industrySector,
    mouStatus: req.body.mouStatus,
    mouDate: req.body.mouDate,
  });

  res.status(200).json({ success: true, data: company });
});

const assignMyCompany = asyncHandler(async (req, res) => {
  const company = await companiesService.linkSupervisorToCompany(req.user.id, req.body.companyId);
  res.status(200).json({ success: true, data: company });
});

module.exports = { listCompanies, createCompany, updateCompany, assignMyCompany };
