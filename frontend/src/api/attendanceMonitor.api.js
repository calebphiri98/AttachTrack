import { request } from './httpClient';

export function getAttendanceMonitor(days = 14) {
  return request(`/attendance/monitor?days=${days}`, { cache: false });
}
