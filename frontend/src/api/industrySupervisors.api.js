import { request } from './httpClient';

export function listMyStudents() {
  return request('/industry-supervisors/students');
}

export function listAll() {
  return request('/industry-supervisors');
}
