import { request } from './httpClient';

export function listMyStudents() {
  return request('/university-supervisors/students');
}

export function addStudent({ email }) {
  return request('/university-supervisors/students', { method: 'POST', body: { email } });
}