import { request } from './httpClient';

const FORMATS = ['csv', 'pdf', 'docx'];

function normalizeFormat(format) {
  if (!FORMATS.includes(format)) throw new Error('Unsupported report format');
  return format;
}

export function exportStudentReport(studentId, format = 'csv') {
  return request(`/reports/student/${encodeURIComponent(studentId)}?format=${normalizeFormat(format)}`, { responseType: 'blob', cache: false, timeoutMs: 45000 });
}

export function exportCohortReport(format = 'csv') {
  return request(`/reports/cohort?format=${normalizeFormat(format)}`, { responseType: 'blob', cache: false, timeoutMs: 45000 });
}
