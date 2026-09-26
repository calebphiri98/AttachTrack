import { request } from './httpClient';

export function listMyStudents() {
  return request('/university-supervisors/students');
}

export function addStudent({ name, email }) {
  return request('/university-supervisors/students', { method: 'POST', body: { name, email } });
}