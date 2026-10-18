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
  if (payload.clientUuid) {
    form.append('clientUuid', payload.clientUuid);
  }
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

export function createLogbookEntry(payload, options = {}) {
  return request('/logbooks/me', {
    method: 'POST',
    body: buildForm(payload),
    isForm: true,
    ...options,
  });
}

export function updateLogbookEntry(entryId, payload, options = {}) {
  return request(`/logbooks/me/${entryId}`, {
    method: 'PUT',
    body: buildForm(payload),
    isForm: true,
    ...options,
  });
}

export function addLogbookFiles(entryId, files, options = {}) {
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  return request(`/logbooks/me/${entryId}/files`, {
    method: 'POST',
    body: form,
    isForm: true,
    ...options,
  });
}

export function deleteLogbookEntry(entryId, options = {}) {
  return request(`/logbooks/me/${entryId}`, { method: 'DELETE', ...options });
}

export function submitLogbookEntry(entryId, options = {}) {
  return request(`/logbooks/me/${entryId}/submit`, { method: 'POST', body: {}, ...options });
}

export function submitLogbookWeek(weekStart, options = {}) {
  return request(`/logbooks/me/weeks/${weekStart}/submit`, {
    method: 'POST',
    body: {},
    ...options,
  });
}

export function reviewLogbookWeek(studentId, weekStart, { decision, comment }) {
  return request(`/logbooks/student/${studentId}/weeks/${weekStart}/review`, {
    method: 'POST',
    body: { decision, comment },
  });
}
