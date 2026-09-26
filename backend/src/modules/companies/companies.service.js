const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireString, requireUuid, optionalString } = require('../../utils/validators');

async function listCompanies() {
  const { rows } = await db.query(
    `SELECT c.*,
            COALESCE(s.supervisor_count, 0) AS supervisor_count
     FROM companies c
     LEFT JOIN (
       SELECT company_id, COUNT(*)::int AS supervisor_count
       FROM industry_supervisors
       WHERE company_id IS NOT NULL
       GROUP BY company_id
     ) s ON s.company_id = c.id
     ORDER BY c.created_at DESC`
  );
  return rows;
}

async function getCompanyById(companyId) {
  requireUuid(companyId, 'companyId');
  const { rows } = await db.query('SELECT * FROM companies WHERE id = $1', [companyId]);
  const company = rows[0];
  if (!company) throw new AppError('Company not found', 404);
  return company;
}

async function createCompany({ name, address, industrySector, mouStatus, mouDate }) {
  const cleanName = requireString(name, 'name', { max: 200 });
  const cleanAddress = optionalString(address, { max: 2000 });
  const cleanIndustrySector = optionalString(industrySector, { max: 150 });
  const cleanMouStatus = requireString(mouStatus || 'pending', 'mouStatus', { max: 50 });

  const { rows } = await db.query(
    `INSERT INTO companies (name, address, industry_sector, mou_status, mou_date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [cleanName, cleanAddress, cleanIndustrySector, cleanMouStatus, mouDate || null]
  );

  return rows[0];
}

async function updateCompany(companyId, updates) {
  const existing = await getCompanyById(companyId);
  const cleanName = updates.name !== undefined ? requireString(updates.name, 'name', { max: 200 }) : existing.name;
  const cleanAddress = updates.address !== undefined ? optionalString(updates.address, { max: 2000 }) : existing.address;
  const cleanIndustrySector = updates.industrySector !== undefined ? optionalString(updates.industrySector, { max: 150 }) : existing.industry_sector;
  const cleanMouStatus = updates.mouStatus !== undefined ? requireString(updates.mouStatus, 'mouStatus', { max: 50 }) : existing.mou_status;

  const { rows } = await db.query(
    `UPDATE companies
     SET name = $1,
         address = $2,
         industry_sector = $3,
         mou_status = $4,
         mou_date = $5,
         updated_at = now()
     WHERE id = $6
     RETURNING *`,
    [cleanName, cleanAddress, cleanIndustrySector, cleanMouStatus, updates.mouDate || null, companyId]
  );

  return rows[0];
}

async function linkSupervisorToCompany(userId, companyId) {
  requireUuid(companyId, 'companyId');
  await getCompanyById(companyId);

  const { rows } = await db.query(
    `SELECT * FROM industry_supervisors WHERE user_id = $1`,
    [userId]
  );

  if (!rows[0]) throw new AppError('Industry supervisor profile not found', 404);

  const updated = await db.query(
    `UPDATE industry_supervisors SET company_id = $1 WHERE user_id = $2 RETURNING *`,
    [companyId, userId]
  );

  return updated.rows[0];
}

module.exports = { listCompanies, getCompanyById, createCompany, updateCompany, linkSupervisorToCompany };
