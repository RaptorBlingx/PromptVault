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
        error = `${pendingChanges} pending change${pendingChanges === 1 ? '' : 's'} remain unsynced. Try again in a moment.`;
      }

      set({
        status,
        lastSyncedAt: syncEngine.getLastSyncTimestamp(),
        pendingChanges,
        error,
      });
    } catch (error) {
      const pendingChanges = await syncEngine.getPendingChangesCount();
      set({
        status: 'error',
        pendingChanges,
        error: (error as Error).message,
      });
    }
  },

  updateConnectivity: (status: ConnectivityStatus) => {
    set({
      connectivity: status,
      status: status === 'offline' ? 'offline' : get().status,
    });
  },

  updatePhase: (phase: SyncPhase, detail?: string) => {
    const newState: Partial<SyncStoreState> = { phase };
    if (phase === 'error' && detail) {
      newState.error = detail;
      newState.status = 'error';
    } else if (phase === 'idle') {
      newState.status = connectivity.isOnline() ? 'synced' : 'offline';
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
