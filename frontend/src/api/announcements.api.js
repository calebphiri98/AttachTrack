import { request } from './httpClient';

export const listAnnouncements = () => request('/announcements');
export const createAnnouncement = (payload) => request('/announcements', { method: 'POST', body: payload });
export const listReplies = (id) => request(`/announcements/${id}/replies`);
export const postReply = (id, body) => request(`/announcements/${id}/replies`, { method: 'POST', body: { body } });
