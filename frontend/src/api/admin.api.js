import { request } from './httpClient';

export function getAdminDashboard() {
  return request('/admin/dashboard');
}

export function getAdminStudents() {
  return request('/admin/students');
}

export function listSupervisors() {
  return request('/admin/supervisors');
}

export function assignStudentSupervisors(studentId, { industrySupervisorId, universitySupervisorId }) {
  return request(`/admin/students/${studentId}/supervisors`, {
    method: 'PATCH',
    body: { industrySupervisorId, universitySupervisorId },
  });
}

export function createAccount({ name, email, role }) {
  return request('/admin/users', {
    method: 'POST',
    body: { name, email, role },
  });
}

export function listUsers() {
  return request('/admin/users');
}

export function setUserActive(userId, isActive) {
  return request(`/admin/users/${userId}/active`, {
    method: 'PATCH',
    body: { isActive },
  });
}