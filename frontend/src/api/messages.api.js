import { request } from './httpClient';

export function listContacts() {
  return request('/messages/contacts');
}

export function listThreads() {
  return request('/messages/threads');
}

export function getThread(userId) {
  return request(`/messages/thread/${userId}`);
}

export function sendMessage({ recipientId, content, file }) {
  if (file) {
    const formData = new FormData();
    formData.append('recipientId', recipientId);
    if (content) formData.append('content', content);
    formData.append('file', file);
    return request('/messages', { method: 'POST', body: formData, isForm: true });
  }
  return request('/messages', { method: 'POST', body: { recipientId, content } });
}

export function markRead(messageId) {
  return request(`/messages/${messageId}/read`, { method: 'PATCH' });
}