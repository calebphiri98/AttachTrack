import { request } from './httpClient';

export function getCurrentTempSupervisor(studentId) {
  return request(`/temp-supervisors/student/${studentId}`);
}

export function listTempSupervisorHistory(studentId) {
  return request(`/temp-supervisors/student/${studentId}/history`);
}

export function assignTempSupervisor({ studentId, industrySupervisorId, department }) {
  return request('/temp-supervisors/assign', {
    method: 'POST',
    body: { studentId, industrySupervisorId, department },
  });
}

export function endTempSupervisor(studentId) {
  return request('/temp-supervisors/end', {
    method: 'POST',
    body: { studentId },
  });
}
