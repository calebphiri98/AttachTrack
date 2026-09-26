import { request } from './httpClient';

export function getAdminDashboard() {
  return request('/admin/dashboard');
}

export function getAdminStudents() {
  return request('/admin/students');
}

export function assignStudentSupervisors(studentId, { industrySupervisorId, universitySupervisorId }) {
  return request(`/admin/students/${studentId}/supervisors`, {
    method: 'PATCH',
    body: { industrySupervisorId, universitySupervisorId },
  });
}
