import { request } from './httpClient';

export function createFeedback({ studentId, content, flaggedConcern }) {
  return request('/feedback', {
    method: 'POST',
    body: { studentId, content, flaggedConcern },
  });
}

export function listFeedbackForStudent(studentId) {
  return request(`/feedback/student/${studentId}`);
}
