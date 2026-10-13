import { request } from './httpClient';

export function listAssessmentForms() {
  return request('/assessments/forms');
}

export function updateFormSettings(kind, { title, weightPercent }) {
  return request(`/assessments/forms/${kind}`, {
    method: 'PATCH',
    body: { title, weightPercent },
  });
}

export function addCriterion(kind, { label, description, maxMarks }) {
  return request(`/assessments/forms/${kind}/criteria`, {
    method: 'POST',
    body: { label, description, maxMarks },
  });
}

export function updateCriterion(criterionId, payload) {
  return request(`/assessments/criteria/${criterionId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteCriterion(criterionId) {
  return request(`/assessments/criteria/${criterionId}`, { method: 'DELETE' });
}

export function confirmForm(kind) {
  return request(`/assessments/forms/${kind}/confirm`, { method: 'POST', body: {} });
}

export function listIndustryStudents() {
  return request('/assessments/industry/students');
}

export function getIndustryAssessment(studentId) {
  return request(`/assessments/industry/students/${studentId}`);
}

export function saveIndustryAssessment(studentId, { scores, comments, submit }) {
  return request(`/assessments/industry/students/${studentId}`, {
    method: 'PUT',
    body: { scores, comments, submit },
  });
}