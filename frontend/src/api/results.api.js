import { request } from './httpClient';

export function getCompileOverview() {
  return request('/results/overview');
}

export function compileResult(studentId) {
  return request(`/results/${studentId}/compile`, { method: 'POST', body: {} });
}

export function compileAllResults() {
  return request('/results/compile-all', { method: 'POST', body: {} });
}

export function remindAssessors(studentId) {
  return request(`/results/${studentId}/remind`, { method: 'POST', body: {} });
}

export function sendResultsToHod() {
  return request('/results/send-to-hod', { method: 'POST', body: {} });
}

export function getHodResults() {
  return request('/results/hod');
}

export function approveResult(resultId) {
  return request(`/results/${resultId}/approve`, { method: 'POST', body: {} });
}

export function approveAllResults() {
  return request('/results/approve-all', { method: 'POST', body: {} });
}

export function releaseResult(resultId) {
  return request(`/results/${resultId}/release`, { method: 'POST', body: {} });
}

export function releaseAllResults() {
  return request('/results/release-all', { method: 'POST', body: {} });
}

export function getMyResult() {
  return request('/results/mine');
}