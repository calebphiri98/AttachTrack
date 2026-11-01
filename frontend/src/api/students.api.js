import { request } from './httpClient';

export function getMyStudentProfile() {
  return request('/students/me');
}

export function updateMyAreaInterest(areaInterest) {
  return request('/students/me/area-interest', {
    method: 'PATCH',
    body: { areaInterest },
  });
}
