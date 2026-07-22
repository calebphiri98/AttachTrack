import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { trySyncQueuedSubmissions } from '../../offline/syncSubmissions';

// Renders nothing. Wires up automatic background sync of anything queued
// in IndexedDB (currently: offline document submissions) whenever the app
// has an authenticated session. Runs on: mount (covers refresh-while-online
// and app-load-with-leftover-queue-items) and the browser's `online` event
// (covers reconnecting mid-session).
//
// Deliberately does NOT gate on navigator.onLine — it's an unreliable
// signal (observed stuck reporting `false` in Chrome after toggling
// DevTools network throttling within the same tab, even with a real
// working connection underneath). Instead, trySyncQueuedSubmissions
// itself is the real connectivity test: each submit attempt either
// succeeds, gets a real server response (statusCode set), or fails as a
// genuine network error (no statusCode) — that's the accurate signal,
// not this browser flag.
export default function SyncManager() {
  const { status } = useAuth();

  useEffect(() => {
    console.log('[sync] SyncManager check — status:', status, 'online:', navigator.onLine);
    if (status === 'authenticated') {
      trySyncQueuedSubmissions();
    }
  }, [status]);

  useEffect(() => {
    function handleOnline() {
      if (status === 'authenticated') {
        trySyncQueuedSubmissions();
      }
    }
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [status]);

  return null;
}