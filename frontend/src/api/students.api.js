import { request } from './httpClient';

export function getMyStudentProfile() {
  return request('/students/me');
}
