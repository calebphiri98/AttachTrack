const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const { requireString, requireUuid, optionalString } = require('../../utils/validators');

function parseAvailablePlaces(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new AppError('availablePlaces must be a whole number of 0 or more', 400);
  }
  return number;
}

async function listCompanies() {
  const { rows } = await db.query(
    `SELECT c.*,
            COALESCE(s.supervisor_count, 0) AS supervisor_count,
            COALESCE(p.placement_count, 0) AS placement_count,
            CASE
              WHEN c.available_places IS NULL THEN NULL
              ELSE GREATEST(c.available_places - COALESCE(p.placement_count, 0), 0)
            END AS places_left
     FROM companies c
     LEFT JOIN (
       SELECT company_id, COUNT(*)::int AS supervisor_count
       FROM industry_supervisors
       WHERE company_id IS NOT NULL
       GROUP BY company_id
     ) s ON s.company_id = c.id
     LEFT JOIN (
       SELECT company_id, COUNT(*)::int AS placement_count
       FROM placements
       GROUP BY company_id
     ) p ON p.company_id = c.id
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

async function countPlacements(companyId) {
  const { rows } = await db.query(
    'SELECT COUNT(*)::int AS count FROM placements WHERE company_id = $1',
    [companyId]
  );
  return rows[0].count;
}

async function createCompany({ name, address, industrySector, mouStatus, mouDate, availablePlaces }) {
  const cleanName = requireString(name, 'name', { max: 200 });
  const cleanAddress = optionalString(address, { max: 2000 });
  const cleanIndustrySector = optionalString(industrySector, { max: 150 });
  const cleanMouStatus = requireString(mouStatus || 'pending', 'mouStatus', { max: 50 });
  const parsedPlaces = parseAvailablePlaces(availablePlaces);

  const { rows } = await db.query(
    `INSERT INTO companies (name, address, industry_sector, mou_status, mou_date, available_places)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      cleanName,
      cleanAddress,
      cleanIndustrySector,
      cleanMouStatus,
      mouDate || null,
      parsedPlaces === undefined ? null : parsedPlaces,
    ]
  );

  return rows[0];
}

async function updateCompany(companyId, updates) {
  const existing = await getCompanyById(companyId);
  const cleanName = updates.name !== undefined ? requireString(updates.name, 'name', { max: 200 }) : existing.name;
  const cleanAddress = updates.address !== undefined ? optionalString(updates.address, { max: 2000 }) : existing.address;
  const cleanIndustrySector = updates.industrySector !== undefined ? optionalString(updates.industrySector, { max: 150 }) : existing.industry_sector;
  const cleanMouStatus = updates.mouStatus !== undefined ? requireString(updates.mouStatus, 'mouStatus', { max: 50 }) : existing.mou_status;
  const nextMouDate = updates.mouDate !== undefined ? updates.mouDate || null : existing.mou_date;

  const parsedPlaces = parseAvailablePlaces(updates.availablePlaces);
  const nextPlaces = parsedPlaces === undefined ? existing.available_places : parsedPlaces;

  if (nextPlaces !== null) {
    const placed = await countPlacements(companyId);
    if (placed > nextPlaces) {
      throw new AppError(
        `${placed} students are already placed at this company, so places cannot be set below ${placed}`,
        409
      );
    }
  }

  const { rows } = await db.query(
    `UPDATE companies
     SET name = $1,
         address = $2,
         industry_sector = $3,
         mou_status = $4,
         mou_date = $5,
         available_places = $6,
         updated_at = now()
     WHERE id = $7
     RETURNING *`,
    [cleanName, cleanAddress, cleanIndustrySector, cleanMouStatus, nextMouDate, nextPlaces, companyId]
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