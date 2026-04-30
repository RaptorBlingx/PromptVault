// ============================================
// PromptVault Mobile - Sync Store
// Tracks sync status for UI display
// ============================================

import { create } from 'zustand';
import { SyncStatus, SyncState } from '../shared/types';
import { syncEngine, SyncPhase, connectivity, ConnectivityStatus } from '../sync';

interface SyncStoreState extends SyncState {
  phase: SyncPhase;
  connectivity: ConnectivityStatus;
  triggerSync: () => Promise<void>;
  updateConnectivity: (status: ConnectivityStatus) => void;
  updatePhase: (phase: SyncPhase, detail?: string) => void;
  refreshPendingCount: () => Promise<void>;
}

export const useSyncStore = create<SyncStoreState>((set, get) => ({
  status: 'offline' as SyncStatus,
  lastSyncedAt: null,
  pendingChanges: 0,
  error: null,
  phase: 'idle' as SyncPhase,
  connectivity: 'checking' as ConnectivityStatus,

  triggerSync: async () => {
    if (get().phase !== 'idle') return;
    set({ status: 'syncing', error: null });

    try {
      await syncEngine.sync();
      const pendingChanges = await syncEngine.getPendingChangesCount();
      const isOnline = connectivity.isOnline();
      let status: SyncStatus = 'synced';
      let error: string | null = null;

      if (!isOnline) {
        status = 'offline';
      } else if (pendingChanges > 0) {
        status = 'error';
        error = `${pendingChanges} pending change${pendingChanges === 1 ? '' : 's'} remain unsynced. Changes will sync automatically when the connection improves, or you can tap Sync Now.`;
      }

      set({
        status,
        lastSyncedAt: syncEngine.getLastSyncTimestamp(),
        pendingChanges,
        error,
      });
    } catch (error) {
      const pendingChanges = await syncEngine
        .getPendingChangesCount()
        .catch(() => get().pendingChanges);

      set({
        status: connectivity.isOnline() ? 'error' : 'offline',
        pendingChanges,
        error: error instanceof Error ? error.message : 'Unknown sync error',
      });
    }
  },

  updateConnectivity: (status: ConnectivityStatus) => {
    const current = get();
    let nextStatus: SyncStatus = current.status;

    if (status === 'offline') {
      nextStatus = 'offline';
    } else if (current.phase === 'idle' && current.status === 'offline' && current.pendingChanges === 0) {
      nextStatus = 'synced';
    }

    set({
      connectivity: status,
      status: nextStatus,
    });
  },

  updatePhase: (phase: SyncPhase, detail?: string) => {
    const newState: Partial<SyncStoreState> = { phase };
    if (phase === 'error' && detail) {
      newState.error = detail;
      newState.status = connectivity.isOnline() ? 'error' : 'offline';
    } else if (phase === 'idle') {
      newState.status = connectivity.isOnline() ? get().status === 'syncing' ? 'synced' : get().status : 'offline';
    } else {
      newState.status = 'syncing';
    }
    set(newState);
  },

  refreshPendingCount: async () => {
    const count = await syncEngine.getPendingChangesCount();
    set({ pendingChanges: count });
  },
}));
