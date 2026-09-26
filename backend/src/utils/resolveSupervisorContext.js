const industrySupervisorsService = require('../modules/industrySupervisors/industrySupervisors.service');
const universitySupervisorsService = require('../modules/universitySupervisors/universitySupervisors.service');

// Given req.user ({ id, role }), returns { column, id } where `id` is the
// supervisor's own row id in industry_supervisors / university_supervisors
// (not their users.id) and `column` is the matching FK column on `students`.
async function resolveSupervisorContext(user) {
  if (user.role === 'industry_supervisor') {
    const record = await industrySupervisorsService.getSupervisorRecordByUserId(user.id);
    return { column: 'industry_supervisor_id', id: record.id };
  }
  if (user.role === 'university_supervisor') {
    const record = await universitySupervisorsService.getSupervisorRecordByUserId(user.id);
    return { column: 'university_supervisor_id', id: record.id };
  }
  return null;
}

module.exports = resolveSupervisorContext;
