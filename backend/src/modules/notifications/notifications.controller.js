const notificationsService = require('./notifications.service');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

const list = asyncHandler(async (req, res) => {
  const notifications = await notificationsService.listForUser(req.user.id);
  res.status(200).json({ success: true, data: notifications });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationsService.markRead(req.params.id, req.user.id);
  if (!notification) {
    throw new AppError('Notification not found or already read', 404);
  }
  res.status(200).json({ success: true, data: notification });
});

module.exports = { list, markRead };
