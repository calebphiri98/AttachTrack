import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useAuth } from '../context/AuthContext';
import { getNetworkSnapshot, onNetworkRestored, subscribeNetwork } from './network';
import { listRecords, subscribeOutbox } from './outbox';
import { getSyncSnapshot, onSyncFinished, subscribeSync } from './syncEngine';

export function useNetworkStatus() {
  return useSyncExternalStore(subscribeNetwork, getNetworkSnapshot, getNetworkSnapshot);
}

export function useSyncSnapshot() {
  return useSyncExternalStore(subscribeSync, getSyncSnapshot, getSyncSnapshot);
}

export function useOutbox() {
  const { user } = useAuth();
  const userId = user ? user.id : null;
  const [records, setRecords] = useState([]);

  const load = useCallback(async () => {
    if (!userId) {
      setRecords([]);
      return;
    }
    try {
      setRecords(await listRecords({ userId }));
    } catch {
      setRecords([]);
    }
  }, [userId]);

  useEffect(() => {
    load();
    return subscribeOutbox(load);
  }, [load]);

  return records;
}

export function useUnsyncedCount() {
  const records = useOutbox();
  return useMemo(() => {
    const counts = { pending: 0, syncing: 0, failed: 0, total: 0 };
    records.forEach((item) => {
      if (item.status === 'synced') return;
      counts[item.status] += 1;
      counts.total += 1;
    });
    return counts;
  }, [records]);
}

export function useSyncRefresh(callback) {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    let timer = null;
    const fire = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => saved.current(), 400);
    };
    const stopSync = onSyncFinished(fire);
    const stopNetwork = onNetworkRestored(fire);
    return () => {
      if (timer) clearTimeout(timer);
      stopSync();
      stopNetwork();
    };
  }, []);
}
