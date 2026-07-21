import { request } from './httpClient';

export function getGradeForStudent(studentId) {
  return request(`/grades/student/${studentId}`);
}

export function assignGrade({ studentId, gradeValue, comments }) {
  return request('/grades', { method: 'POST', body: { studentId, gradeValue, comments } });
}