import { request } from './httpClient';

const TEXT_FIELDS = [
  'entryDate',
  'startTime',
  'endTime',
  'activity',
  'description',
  'skillsLearned',
  'challenges',
  'toolsUsed',
];

function buildForm(payload) {
  const form = new FormData();
  TEXT_FIELDS.forEach((key) => form.append(key, payload[key] ?? ''));
  form.append('submit', payload.submit ? 'true' : 'false');
  if (payload.removeFileIds && payload.removeFileIds.length > 0) {
    form.append('removeFileIds', JSON.stringify(payload.removeFileIds));
  }
  (payload.files || []).forEach((file) => form.append('files', file));
  return form;
}

export function getMyLogbook() {
  return request('/logbooks/me');
}

export function getStudentLogbook(studentId) {
  return request(`/logbooks/student/${studentId}`);
}

export function createLogbookEntry(payload) {
  return request('/logbooks/me', { method: 'POST', body: buildForm(payload), isForm: true });
}

export function updateLogbookEntry(entryId, payload) {
  return request(`/logbooks/me/${entryId}`, {
    method: 'PUT',
    body: buildForm(payload),
    isForm: true,
  });
}

export function deleteLogbookEntry(entryId) {
  return request(`/logbooks/me/${entryId}`, { method: 'DELETE' });
}

export function submitLogbookEntry(entryId) {
  return request(`/logbooks/me/${entryId}/submit`, { method: 'POST', body: {} });
}

export function submitLogbookWeek(weekStart) {
  return request(`/logbooks/me/weeks/${weekStart}/submit`, { method: 'POST', body: {} });
}

export function reviewLogbookWeek(studentId, weekStart, { decision, comment }) {
  return request(`/logbooks/student/${studentId}/weeks/${weekStart}/review`, {
    method: 'POST',
    body: { decision, comment },
  });
}