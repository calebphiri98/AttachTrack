const db = require('../../config/db');
const asyncHandler = require('../../utils/asyncHandler');

const getMine = asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT c.name AS company_name,
            c.address,
            c.industry_sector,
            p.confirmed_at
     FROM placements p
     JOIN students s ON s.id = p.student_id
     JOIN companies c ON c.id = p.company_id
     WHERE s.user_id = $1 AND p.status = 'confirmed'`,
    [req.user.id]
  );

  res.status(200).json({ success: true, data: rows[0] || null });
});

module.exports = { getMine };