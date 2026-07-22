import { getQueuedSubmissions, removeQueuedSubmission } from './db';
import * as submissionsApi from '../api/submissions.api';

let syncing = false; // guards against overlapping runs if multiple triggers fire close together

export async function trySyncQueuedSubmissions() {
  console.log('[sync] trySyncQueuedSubmissions called, syncing =', syncing);
  if (syncing) return;
  syncing = true;

  try {
    const queued = await getQueuedSubmissions();
    console.log('[sync] queued items:', queued);
    const pending = queued.filter((item) => item.status === 'pending_sync');
    console.log('[sync] pending items to sync:', pending.length);

    for (const item of pending) {
      try {
        console.log('[sync] attempting submit for', item.fileName, item.clientUuid);
        await submissionsApi.submitDocument(item.file, item.clientUuid);
        await removeQueuedSubmission(item.clientUuid);
        console.log('[sync] synced and removed', item.fileName);
      } catch (err) {
        console.log('[sync] failed for', item.fileName, 'statusCode:', err.statusCode, err.message);
        if (!err.statusCode) break;
      }
    }
  } finally {
    syncing = false;
    window.dispatchEvent(new CustomEvent('attachtrack:submissions-synced'));
  }
}