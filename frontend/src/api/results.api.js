import { request } from './httpClient';

export function getResultsOverview() {
  return request('/grades/overview');
}

export function releaseResult(studentId) {
  return request(`/grades/${studentId}/release`, { method: 'POST', body: {} });
}

export function releaseAllResults() {
  return request('/grades/release-all', { method: 'POST', body: {} });
}