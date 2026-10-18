import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { setSyncUser, startSyncEngine } from '../../offline/syncEngine';
import { onNetworkRestored } from '../../offline/network';
import { prefetchForRole } from '../../offline/prefetch';
import { requestPersistentStorage } from '../../offline/persist';

const PREFETCH_INTERVAL_MS = 10 * 60 * 1000;

export default function SyncManager() {
  const { status, user } = useAuth();

  useEffect(() => startSyncEngine(), []);

  useEffect(() => {
    if (status !== 'authenticated' || !user) {
      setSyncUser(null);
      return undefined;
    }

    setSyncUser(user.id);
    requestPersistentStorage();
    prefetchForRole(user.role, { force: true }).catch(() => {});

    const timer = setInterval(() => {
      prefetchForRole(user.role).catch(() => {});
    }, PREFETCH_INTERVAL_MS);
    const stopRestored = onNetworkRestored(() => {
      prefetchForRole(user.role).catch(() => {});
    });

    return () => {
      clearInterval(timer);
      stopRestored();
    };
  }, [status, user]);

  return null;
}
