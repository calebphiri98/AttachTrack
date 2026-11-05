const db = require('../../config/db');
const AppError = require('../../utils/AppError');
const asyncHandler = require('../../utils/asyncHandler');
const { requireUuid } = require('../../utils/validators');

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function checkPeriod(startDate, endDate) {
  if (!validDate(startDate) || !validDate(endDate)) {
    throw new AppError('Both attachment dates must use YYYY-MM-DD', 400);
  }
  if (endDate < startDate) {
    throw new AppError('Attachment end date must not be before the start date', 400);
  }
  return { startDate, endDate };
}

const savePeriod = asyncHandler(async (req, res) => {
  requireUuid(req.params.placementId, 'placementId');
  const { startDate, endDate } = checkPeriod(req.body?.startDate, req.body?.endDate);
  const { rows } = await db.query(
    `UPDATE placements
     SET attachment_start_date = $2::date,
         attachment_end_date = $3::date,
         updated_at = now()
     WHERE id = $1 AND status = 'confirmed'
     RETURNING id, attachment_start_date, attachment_end_date`,
    [req.params.placementId, startDate, endDate]
  );
  if (!rows[0]) throw new AppError('Confirmed placement not found', 404);
  res.status(200).json({ success: true, data: rows[0] });
});

module.exports = { validDate, checkPeriod, savePeriod };
