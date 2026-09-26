import { request } from './httpClient';

export function exportStudentReport(studentId) {
  return request(`/reports/student/${studentId}`, { parseJson: false });
}

export function exportCohortReport() {
  return request('/reports/cohort', { parseJson: false });
}
