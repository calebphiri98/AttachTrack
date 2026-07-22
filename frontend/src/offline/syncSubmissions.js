import { getQueuedSubmissions, removeQueuedSubmission, updateQueuedSubmission } from './db';
import * as submissionsApi from '../api/submissions.api';

let syncing = false; // guards against overlapping runs if multiple triggers fire close together

export async function trySyncQueuedSubmissions() {
  if (syncing) return;
  syncing = true;

  try {
    const queued = await getQueuedSubmissions();
    // Retry both untried items AND items that failed before (manual retry,
    // or a fresh reconnect worth trying again) — but not items still
    // mid-flight from another concurrent call, which can't happen anyway
    // since `syncing` guards against overlapping runs.
    const pending = queued.filter(
      (item) => item.status === 'pending_sync' || item.status === 'failed'
    );

    for (const item of pending) {
      try {
        // Same clientUuid as the original click-time attempt — if the
        // server actually received a prior attempt but the response was
        // lost (e.g. connection dropped mid-response), this is a safe
        // no-op retry: the backend's dedup returns the existing row
        // instead of creating a duplicate.
        await submissionsApi.submitDocument(item.file, item.clientUuid);
        await removeQueuedSubmission(item.clientUuid);
      } catch (err) {
        if (err.statusCode) {
          // A real server rejection (bad file, no longer linked, auth
          // issue) — retrying automatically won't fix this on its own.
          // Mark it failed with a reason so the UI can show it distinctly
          // and offer a manual retry, instead of it sitting silently
          // "pending" forever looking identical to a real connectivity wait.
          await updateQueuedSubmission(item.clientUuid, {
            status: 'failed',
            errorMessage: err.message || 'Submission was rejected by the server.',
          });
        } else {
          // Genuine network failure (no statusCode) — we're not actually
          // online yet, or the connection dropped again mid-sync. Stop
          // processing the rest of the queue this run; the next `online`
          // event or app load will retry everything still pending/failed.
          break;
        }
      }
    }
  } finally {
    syncing = false;
    window.dispatchEvent(new CustomEvent('attachtrack:submissions-synced'));
  }
}