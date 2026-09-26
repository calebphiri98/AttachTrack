import { getQueuedSubmissions, removeQueuedSubmission, updateQueuedSubmission } from './db';
import * as submissionsApi from '../api/submissions.api';

let syncing = false;

export async function trySyncQueuedSubmissions() {
  if (syncing) return;
  syncing = true;

  try {
    const queued = await getQueuedSubmissions();
    const pending = queued.filter(
      (item) => item.status === 'pending_sync' || item.status === 'failed'
    );

    for (const item of pending) {
      try {
        await submissionsApi.submitDocument(item.file, item.clientUuid, item.recipientRole);
        await removeQueuedSubmission(item.clientUuid);
      } catch (err) {
        if (err.statusCode) {
          await updateQueuedSubmission(item.clientUuid, {
            status: 'failed',
            errorMessage: err.message || 'Submission was rejected by the server.',
          });
        } else {
          break;
        }
      }
    }
  } finally {
    syncing = false;
    window.dispatchEvent(new CustomEvent('attachtrack:submissions-synced'));
  }
}