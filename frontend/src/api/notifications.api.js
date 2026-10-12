import { request } from './httpClient';

export function getNotifications(limit = 20) {
  return request(`/notifications?limit=${limit}`);
}

export function getUnreadCount() {
  return request('/notifications/unread-count');
}

export function markNotificationRead(id) {
  return request(`/notifications/${id}/read`, { method: 'PATCH', body: {} });
}

export function markAllNotificationsRead() {
  return request('/notifications/read-all', { method: 'PATCH', body: {} });
}

export function getNotificationPreferences() {
  return request('/notifications/preferences');
}

export function saveNotificationPreferences(updates) {
  return request('/notifications/preferences', { method: 'PUT', body: { updates } });
}