import { request } from './httpClient';

export function listSubmissionsForStudent(studentId) {
  return request(`/submissions/student/${studentId}`);
}
