import { request } from './httpClient';

export function markAttendance({ studentId, weekStartDate, status, notes }) {
  return request('/attendance', {
    method: 'POST',
    body: { studentId, weekStartDate, status, notes },
  });
}

export function listAttendanceForStudent(studentId) {
  return request(`/attendance/student/${studentId}`);
}
