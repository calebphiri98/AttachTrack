import { request } from './httpClient';

export function saveAttachmentPeriod(placementId, startDate, endDate) {
  return request(`/placements/${placementId}/period`, {
    method: 'PATCH',
    body: { startDate, endDate },
  });
}
