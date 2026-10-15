import { request } from './httpClient';

export function getPlacementOverview() {
  return request('/placements/overview');
}

export function getMyPlacement() {
  return request('/placements/mine');
}

export function allocatePlacement({ studentId, companyId, preferenceNote }) {
  return request('/placements', {
    method: 'POST',
    body: { studentId, companyId, preferenceNote },
  });
}

export function removeAllocation(studentId) {
  return request(`/placements/student/${studentId}`, { method: 'DELETE' });
}

export function confirmPlacement(placementId) {
  return request(`/placements/${placementId}/confirm`, { method: 'POST', body: {} });
}

export function confirmAllPlacements() {
  return request('/placements/confirm-all', { method: 'POST', body: {} });
}