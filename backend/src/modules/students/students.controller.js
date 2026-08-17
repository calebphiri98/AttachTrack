const studentsService = require('./students.service');
const asyncHandler = require('../../utils/asyncHandler');

const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await studentsService.getProfileByUserId(req.user.id);

  const message =
    profile.link_status === 'unlinked'
      ? 'You are not yet linked to a supervisor. Please contact your Industry Supervisor or University Supervisor to be added.'
      : null;

  res.status(200).json({ success: true, data: { ...profile, message } });
});

const updateMyLocation = asyncHandler(async (req, res) => {
  const profile = await studentsService.updateLocation({
    userId: req.user.id,
    location: req.body.location,
  });

  res.status(200).json({ success: true, data: profile });
});

module.exports = { getMyProfile, updateMyLocation };
