import { request } from './httpClient';

export function saveSiteVisit(payload, options = {}) {
  const form = new FormData();
  form.append('studentId', payload.studentId);
  form.append('visitDate', payload.visitDate);
  if (payload.notes) form.append('notes', payload.notes);
  if (payload.photo) form.append('photo', payload.photo);

  return request('/site-visits', { method: 'POST', body: form, isForm: true, ...options });
}

export function getSiteVisits(studentId) {
  return request(`/site-visits/student/${studentId}`);
}
