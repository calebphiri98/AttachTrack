import { request } from './httpClient';

export function getMyLogbook() {
  return request('/logbooks/me');
}

export function createLogbookEntry(payload) {
  const form = new FormData();
  if (payload.entryDate) form.append('entryDate', payload.entryDate);
  if (payload.activity) form.append('activity', payload.activity);
  if (payload.notes) form.append('notes', payload.notes);
  if (payload.file) form.append('file', payload.file);

  return request('/logbooks/me', { method: 'POST', body: form, isForm: true });
}

export function getStudentLogbook(studentId) {
  return request(`/logbooks/student/${studentId}`);
}
