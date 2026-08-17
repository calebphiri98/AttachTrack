import { request } from './httpClient';

export function getMyStudentProfile() {
  return request('/students/me');
}

export function updateLocation({ location }) {
  return request('/students/me/location', { method: 'PATCH', body: { location } });
}
