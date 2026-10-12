const notificationsService = require('./notifications.service');
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

const list = asyncHandler(async (req, res) => {
  const notifications = await notificationsService.listForUser(req.user.id, req.query.limit);
  const unreadCount = await notificationsService.countUnread(req.user.id);
  res.status(200).json({ success: true, data: notifications, unreadCount });
});

const unreadCount = asyncHandler(async (req, res) => {
  const count = await notificationsService.countUnread(req.user.id);
  res.status(200).json({ success: true, data: { count } });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationsService.markRead(req.params.id, req.user.id);
  if (!notification) {
    throw new AppError('Notification not found or already read', 404);
  }
  res.status(200).json({ success: true, data: notification });
});

const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationsService.markAllRead(req.user.id);
  res.status(200).json({ success: true, data: result });
});

const getPreferences = asyncHandler(async (req, res) => {
  const preferences = await notificationsService.getPreferencesForUser(req.user.id, req.user.role);
  res.status(200).json({ success: true, data: preferences });
});

const updatePreferences = asyncHandler(async (req, res) => {
  const preferences = await notificationsService.updatePreferences(
    req.user.id,
    req.user.role,
    req.body.updates
  );
  res.status(200).json({ success: true, data: preferences });
});

module.exports = {
  list,
  unreadCount,
  markRead,
  markAllRead,
  getPreferences,
  updatePreferences,
};