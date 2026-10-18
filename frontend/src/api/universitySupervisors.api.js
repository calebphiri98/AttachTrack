import { request } from './httpClient';

export function listMyStudents() {
  return request('/university-supervisors/students');
}
