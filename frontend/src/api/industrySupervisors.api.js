import { request } from './httpClient';

export function listMyStudents() {
  return request('/industry-supervisors/students');
}

export function addStudent({ name, email }) {
  return request('/industry-supervisors/students', { method: 'POST', body: { name, email } });
}
