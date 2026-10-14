import { request } from './httpClient';

export function listMyAttendanceStudents() {
  return request('/attendance/students');
}

export function getStudentAttendance(studentId, limit = 120) {
  return request(`/attendance/student/${studentId}?limit=${limit}`);
}

export function saveAttendance({ studentId, dateFrom, dateTo, status, reason, notes, weekdaysOnly }) {
  return request('/attendance', {
    method: 'POST',
    body: { studentId, dateFrom, dateTo, status, reason, notes, weekdaysOnly },
  });
}