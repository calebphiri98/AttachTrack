import { request } from './httpClient';

export function saveSiteVisit(payload, options = {}) {
  const form = new FormData();
  form.append('studentId', payload.studentId);
  form.append('visitDate', payload.visitDate);
  if (payload.notes) form.append('notes', payload.notes);
  if (payload.photo) form.append('photo', payload.photo);
  if (payload.score !== undefined && payload.score !== '') form.append('score', payload.score);
  return request('/site-visits', { method: 'POST', body: form, isForm: true, ...options });
}
export function getSiteVisits(studentId) {
  return request(`/site-visits/student/${studentId}`, { cache: false });
}
export function scheduleSiteVisit(payload) {
  return request('/site-visits/schedule', { method: 'POST', body: payload });
}
export function completeSiteVisit(id, payload) {
  const form = new FormData();
  if (payload.notes) form.append('notes', payload.notes);
  if (payload.score !== undefined && payload.score !== '') form.append('score', payload.score);
  if (payload.photo) form.append('photo', payload.photo);
  return request(`/site-visits/${id}/complete`, { method: 'PATCH', body: form, isForm: true });
}
