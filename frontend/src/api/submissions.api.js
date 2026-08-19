import { request } from './httpClient';

export function listSubmissionsForStudent(studentId) {
  return request(`/submissions/student/${studentId}`);
}

export function listMine() {
  return request('/submissions/mine');
}

export function submitDocument(file, clientUuid, recipientRole) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('clientUuid', clientUuid);
  formData.append('recipientRole', recipientRole);
  return request('/submissions', { method: 'POST', body: formData, isForm: true });
}