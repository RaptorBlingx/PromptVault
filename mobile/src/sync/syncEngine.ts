// ============================================
// PromptVault Mobile - Sync Engine
// Google Keep-inspired: lazy writes, pull sync,
// last-write-wins conflict resolution
// ============================================

import {
  getAllPrompts, updatePrompt, deletePromptPermanently, createPrompt,
  getAllFolders, updateFolder, deleteFolderPermanently, createFolder,
  createSyncLog,
  type PromptRecord, type FolderRecord,
} from '../db';
import { Prompt, Folder } from '../shared/types';
import * as api from '../api/client';
import { connectivity } from './connectivityMonitor';

export type SyncPhase = 'idle' | 'pushing' | 'pulling' | 'resolving' | 'error';

type SyncListener = (phase: SyncPhase, detail?: string) => void;

interface SyncFailure {
  entityType: 'prompt' | 'folder';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  message: string;
}

class SyncEngine {
  private isSyncing = false;
  private listeners: Set<SyncListener> = new Set();
  private retryCount = 0;
  private maxRetries = 5;
  private lastSyncTimestamp: number | null = null;

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(phase: SyncPhase, detail?: string) {
    this.listeners.forEach((l) => l(phase, detail));
  }

  getLastSyncTimestamp(): number | null {
    return this.lastSyncTimestamp;
  }

  private getServerIdentifier(record: { id: string; serverId: string }): string {
    return record.serverId || `mobile-${record.id}`;
  }

  async sync(): Promise<{ pushed: number; pulled: number; conflicts: number }> {
    if (this.isSyncing) {
      return { pushed: 0, pulled: 0, conflicts: 0 };
    }

    if (!connectivity.isOnline()) {
      this.emit('idle');
      return { pushed: 0, pulled: 0, conflicts: 0 };
    }

    this.isSyncing = true;
    let pushed = 0;
    let pulled = 0;
    let conflicts = 0;

    try {
      this.emit('pushing');
      pushed = await this.pushChanges();

      this.emit('pulling');
      const pullResult = await this.pullChanges();
      pulled = pullResult.pulled;
      conflicts = pullResult.conflicts;

      this.lastSyncTimestamp = Date.now();
      this.retryCount = 0;
      this.emit('idle');
    } catch (error) {
      console.error('Sync failed:', error);
      this.emit('error', (error as Error).message);
      this.scheduleRetry();
      throw error;
    } finally {
      this.isSyncing = false;
    }

    return { pushed, pulled, conflicts };
  }

  private toApiFormat(p: PromptRecord): Prompt {
    return {
      id: this.getServerIdentifier(p),
      title: p.title,
      content: p.content,
      tags: JSON.parse(p.tags || '[]'),
      isFavorite: p.isFavorite,
      isPinned: p.isPinned,
      folderId: p.folderId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      versions: JSON.parse(p.versions || '[]'),
    };
  }

  private folderToApi(f: FolderRecord): Folder {
    return {
      id: this.getServerIdentifier(f),
      name: f.name,
      icon: f.icon,
      color: f.color,
      createdAt: f.createdAt,
    };
  }

  private async pushChanges(): Promise<number> {
    let count = 0;
    const failures: SyncFailure[] = [];
    const allPrompts = await getAllPrompts();
    const allFolders = await getAllFolders();

    // Push created prompts
    for (const prompt of allPrompts.filter((p) => p.syncStatus === 'created')) {
      try {
        const created = await api.createPromptApi(this.toApiFormat(prompt));
        await updatePrompt(prompt.id, (p) => ({
          ...p,
          serverId: created.id,
          syncStatus: 'synced',
          lastSyncedAt: Date.now(),
        }));
        count++;
      } catch (error: any) {
        const targetId = this.getServerIdentifier(prompt);
        if (error.status === 409 && targetId) {
          try {
            await api.updatePromptApi(targetId, this.toApiFormat(prompt));
            await updatePrompt(prompt.id, (p) => ({
              ...p,
              serverId: targetId,
              syncStatus: 'synced',
              lastSyncedAt: Date.now(),
            }));
            count++;
          } catch (updateError: any) {
            console.error('Failed to recover created prompt after conflict:', updateError);
            failures.push(this.toFailure('prompt', prompt.id, 'create', updateError));
          }
        } else {
          console.error('Failed to push created prompt:', error);
          failures.push(this.toFailure('prompt', prompt.id, 'create', error));
        }
      }
    }

    // Push updated prompts
    for (const prompt of allPrompts.filter((p) => p.syncStatus === 'updated')) {
      try {
        if (!prompt.serverId) {
          const created = await api.createPromptApi(this.toApiFormat(prompt));
          await updatePrompt(prompt.id, (p) => ({
            ...p,
            serverId: created.id,
            syncStatus: 'synced',
            lastSyncedAt: Date.now(),
          }));
          count++;
          continue;
        }
        await api.updatePromptApi(prompt.serverId, this.toApiFormat(prompt));
        await updatePrompt(prompt.id, (p) => ({ ...p, syncStatus: 'synced', lastSyncedAt: Date.now() }));
        count++;
      } catch (error: any) {
        if (error.status === 404) {
          try {
            const created = await api.createPromptApi(this.toApiFormat(prompt));
            await updatePrompt(prompt.id, (p) => ({
              ...p,
              serverId: created.id,
              syncStatus: 'synced',
              lastSyncedAt: Date.now(),
            }));
            count++;
          } catch (createError: any) {
            console.error('Failed to recreate updated prompt:', createError);
            failures.push(this.toFailure('prompt', prompt.id, 'update', createError));
          }
        } else {
          console.error('Failed to push updated prompt:', error);
          failures.push(this.toFailure('prompt', prompt.id, 'update', error));
        }
      }
    }

    // Push deleted prompts
    for (const prompt of allPrompts.filter((p) => p.syncStatus === 'deleted')) {
      if (!prompt.serverId) {
        await deletePromptPermanently(prompt.id);
        continue;
      }
      try {
        await api.deletePromptApi(prompt.serverId);
      } catch (error: any) {
        if (error.status !== 404) {
          console.error('Failed to push deleted prompt:', error);
          failures.push(this.toFailure('prompt', prompt.id, 'delete', error));
          continue;
        }
      }
      await deletePromptPermanently(prompt.id);
      count++;
    }

    // Push created folders
    for (const folder of allFolders.filter((f) => f.syncStatus === 'created')) {
      try {
        const created = await api.createFolderApi(this.folderToApi(folder));
        await updateFolder(folder.id, (f) => ({
          ...f,
          serverId: created.id,
          syncStatus: 'synced',
          lastSyncedAt: Date.now(),
        }));
        count++;
      } catch (error: any) {
        const targetId = this.getServerIdentifier(folder);
        if (error.status === 409 && targetId) {
          try {
            await api.updateFolderApi(targetId, this.folderToApi(folder));
            await updateFolder(folder.id, (f) => ({
              ...f,
              serverId: targetId,
              syncStatus: 'synced',
              lastSyncedAt: Date.now(),
            }));
            count++;
          } catch (updateError: any) {
            console.error('Failed to recover created folder after conflict:', updateError);
            failures.push(this.toFailure('folder', folder.id, 'create', updateError));
          }
        } else {
          console.error('Failed to push created folder:', error);
          failures.push(this.toFailure('folder', folder.id, 'create', error));
        }
      }
    }

    // Push updated folders
    for (const folder of allFolders.filter((f) => f.syncStatus === 'updated')) {
      try {
        if (!folder.serverId) {
          const created = await api.createFolderApi(this.folderToApi(folder));
          await updateFolder(folder.id, (f) => ({
            ...f,
            serverId: created.id,
            syncStatus: 'synced',
            lastSyncedAt: Date.now(),
          }));
          count++;
          continue;
        }
        await api.updateFolderApi(folder.serverId, this.folderToApi(folder));
        await updateFolder(folder.id, (f) => ({ ...f, syncStatus: 'synced', lastSyncedAt: Date.now() }));
        count++;
      } catch (error: any) {
        if (error.status === 404) {
          try {
            const created = await api.createFolderApi(this.folderToApi(folder));
            await updateFolder(folder.id, (f) => ({
              ...f,
              serverId: created.id,
              syncStatus: 'synced',
              lastSyncedAt: Date.now(),
            }));
            count++;
          } catch (createError: any) {
            console.error('Failed to recreate updated folder:', createError);
            failures.push(this.toFailure('folder', folder.id, 'update', createError));
          }
        } else {
          console.error('Failed to push updated folder:', error);
          failures.push(this.toFailure('folder', folder.id, 'update', error));
        }
      }
    }

    // Push deleted folders
    for (const folder of allFolders.filter((f) => f.syncStatus === 'deleted')) {
      if (!folder.serverId) {
        await deleteFolderPermanently(folder.id);
        continue;
      }
      try {
        await api.deleteFolderApi(folder.serverId);
      } catch (error: any) {
        if (error.status !== 404) {
          console.error('Failed to push deleted folder:', error);
          failures.push(this.toFailure('folder', folder.id, 'delete', error));
          continue;
        }
      }
      await deleteFolderPermanently(folder.id);
      count++;
    }

    if (failures.length > 0) {
      throw new Error(this.formatFailures(failures));
    }

    return count;
  }

  private async pullChanges(): Promise<{ pulled: number; conflicts: number }> {
    let pulled = 0;
    let conflicts = 0;

    const [remotePrompts, remoteFolders] = await Promise.all([
      api.fetchPrompts(),
      api.fetchFolders(),
    ]);

    // Reconcile folders
    const localFolders = (await getAllFolders()).filter((f) => f.syncStatus !== 'deleted');
    const localFolderMap = new Map(localFolders.map((f) => [f.serverId, f]));

    for (const remoteFolder of remoteFolders) {
      const local = localFolderMap.get(remoteFolder.id);

      if (!local) {
        await createFolder({
          serverId: remoteFolder.id,
          name: remoteFolder.name,
          icon: remoteFolder.icon,
          color: remoteFolder.color,
          createdAt: remoteFolder.createdAt,
          syncStatus: 'synced',
          lastSyncedAt: Date.now(),
        });
        pulled++;
      } else if (local.syncStatus === 'synced') {
        if (local.name !== remoteFolder.name || local.icon !== remoteFolder.icon || local.color !== remoteFolder.color) {
          await updateFolder(local.id, (f) => ({
            ...f,
            name: remoteFolder.name,
            icon: remoteFolder.icon,
            color: remoteFolder.color,
            lastSyncedAt: Date.now(),
          }));
          pulled++;
        }
      }
      localFolderMap.delete(remoteFolder.id);
    }

    for (const [, orphan] of localFolderMap) {
      if (orphan.syncStatus === 'synced') {
        await deleteFolderPermanently(orphan.id);
        pulled++;
      }
    }

    // Reconcile prompts
    const localPrompts = (await getAllPrompts()).filter((p) => p.syncStatus !== 'deleted');
    const localPromptMap = new Map(localPrompts.map((p) => [p.serverId, p]));

    for (const remotePrompt of remotePrompts) {
      const local = localPromptMap.get(remotePrompt.id);

      if (!local) {
        await createPrompt({
          serverId: remotePrompt.id,
          title: remotePrompt.title,
          content: remotePrompt.content,
          tags: JSON.stringify(remotePrompt.tags),
          isFavorite: remotePrompt.isFavorite,
          isPinned: remotePrompt.isPinned,
          folderId: remotePrompt.folderId,
          createdAt: remotePrompt.createdAt,
          updatedAt: remotePrompt.updatedAt,
          versions: JSON.stringify(remotePrompt.versions),
          syncStatus: 'synced',
          lastSyncedAt: Date.now(),
        });
        pulled++;
      } else if (local.syncStatus === 'synced') {
        if (remotePrompt.updatedAt > local.updatedAt) {
          await updatePrompt(local.id, (p) => ({
            ...p,
            title: remotePrompt.title,
            content: remotePrompt.content,
            tags: JSON.stringify(remotePrompt.tags),
            isFavorite: remotePrompt.isFavorite,
            isPinned: remotePrompt.isPinned,
            folderId: remotePrompt.folderId,
            updatedAt: remotePrompt.updatedAt,
            versions: JSON.stringify(remotePrompt.versions),
            lastSyncedAt: Date.now(),
          }));
          pulled++;
        }
      } else if (local.syncStatus === 'updated') {
        if (remotePrompt.updatedAt > local.updatedAt) {
          await updatePrompt(local.id, (p) => ({
            ...p,
            title: remotePrompt.title,
            content: remotePrompt.content,
            tags: JSON.stringify(remotePrompt.tags),
            isFavorite: remotePrompt.isFavorite,
            isPinned: remotePrompt.isPinned,
            folderId: remotePrompt.folderId,
            updatedAt: remotePrompt.updatedAt,
            versions: JSON.stringify(remotePrompt.versions),
            syncStatus: 'synced',
            lastSyncedAt: Date.now(),
          }));
          await this.logConflict('prompt', remotePrompt.id, 'server_wins');
          conflicts++;
        }
      }
      localPromptMap.delete(remotePrompt.id);
    }

    for (const [, orphan] of localPromptMap) {
      if (orphan.syncStatus === 'synced') {
        await deletePromptPermanently(orphan.id);
        pulled++;
      }
    }

    return { pulled, conflicts };
  }

  private async logConflict(entityType: string, entityId: string, resolution: string) {
    try {
      await createSyncLog({
        action: 'conflict',
        entityType,
        entityId,
        details: JSON.stringify({ resolution, timestamp: Date.now() }),
        createdAt: Date.now(),
      });
    } catch (e) {
      console.error('Failed to log conflict:', e);
    }
  }

  private toFailure(
    entityType: SyncFailure['entityType'],
    entityId: string,
    action: SyncFailure['action'],
    error: any,
  ): SyncFailure {
    return {
      entityType,
      entityId,
      action,
      message: error?.response?.error || error?.message || 'Unknown sync error',
    };
  }

  private formatFailures(failures: SyncFailure[]): string {
    const grouped = new Map<string, number>();
    for (const failure of failures) {
      const key = `${failure.action} ${failure.entityType}`;
      grouped.set(key, (grouped.get(key) || 0) + 1);
    }

    const summary = Array.from(grouped.entries())
      .map(([key, count]) => {
        const [action, entityType] = key.split(' ');
        return `${count} ${entityType}${count === 1 ? '' : 's'} (${action})`;
      })
      .join(', ');

    return `Failed to sync ${failures.length} change${failures.length === 1 ? '' : 's'} (${summary}). Check the server and try again.`;
  }

  private scheduleRetry() {
    if (this.retryCount >= this.maxRetries) {
      console.warn('Max sync retries reached');
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 60000);
    this.retryCount++;
    setTimeout(() => {
      if (connectivity.isOnline()) {
        this.sync().catch((error) => {
          console.warn('Retry sync failed:', error);
        });
      }
    }, delay);
  }

  async getPendingChangesCount(): Promise<number> {
    const allPrompts = await getAllPrompts();
    const allFolders = await getAllFolders();
    return allPrompts.filter((p) => p.syncStatus !== 'synced').length +
           allFolders.filter((f) => f.syncStatus !== 'synced').length;
  }
}

// Singleton
export const syncEngine = new SyncEngine();
