// ============================================
// PromptVault Mobile - AsyncStorage Database Layer
// Replaces WatermelonDB for Expo Go compatibility
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../shared/utils';

const PROMPTS_KEY = '@promptvault_prompts';
const FOLDERS_KEY = '@promptvault_folders';
const SYNC_LOG_KEY = '@promptvault_sync_log';

// ----- Types -----

export interface PromptRecord {
  id: string;
  serverId: string;
  title: string;
  content: string;
  tags: string; // JSON array string
  isFavorite: boolean;
  isPinned: boolean;
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
  versions: string; // JSON array string
  syncStatus: string; // 'synced' | 'created' | 'updated' | 'deleted'
  lastSyncedAt: number | null;
}

export interface FolderRecord {
  id: string;
  serverId: string;
  name: string;
  icon: string;
  color: string;
  createdAt: number;
  syncStatus: string;
  lastSyncedAt: number | null;
}

export interface SyncLogRecord {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: number;
}

// ----- Storage helpers -----

async function getAll<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

async function saveAll<T>(key: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items));
}

// ----- Prompts -----

export async function getAllPrompts(): Promise<PromptRecord[]> {
  return getAll<PromptRecord>(PROMPTS_KEY);
}

export async function getPromptById(id: string): Promise<PromptRecord | undefined> {
  const all = await getAllPrompts();
  return all.find((p) => p.id === id);
}

export async function queryPrompts(
  filter: (p: PromptRecord) => boolean,
): Promise<PromptRecord[]> {
  const all = await getAllPrompts();
  return all.filter(filter);
}

export async function countPrompts(
  filter: (p: PromptRecord) => boolean,
): Promise<number> {
  const all = await getAllPrompts();
  return all.filter(filter).length;
}

export async function createPrompt(data: Omit<PromptRecord, 'id'>): Promise<PromptRecord> {
  const all = await getAllPrompts();
  const record: PromptRecord = { id: generateId(), ...data };
  all.push(record);
  await saveAll(PROMPTS_KEY, all);
  return record;
}

export async function updatePrompt(
  id: string,
  updater: (p: PromptRecord) => PromptRecord,
): Promise<PromptRecord | undefined> {
  const all = await getAllPrompts();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  all[idx] = updater({ ...all[idx] });
  await saveAll(PROMPTS_KEY, all);
  return all[idx];
}

export async function deletePromptPermanently(id: string): Promise<void> {
  const all = await getAllPrompts();
  await saveAll(PROMPTS_KEY, all.filter((p) => p.id !== id));
}

// ----- Folders -----

export async function getAllFolders(): Promise<FolderRecord[]> {
  return getAll<FolderRecord>(FOLDERS_KEY);
}

export async function getFolderById(id: string): Promise<FolderRecord | undefined> {
  const all = await getAllFolders();
  return all.find((f) => f.id === id);
}

export async function queryFolders(
  filter: (f: FolderRecord) => boolean,
): Promise<FolderRecord[]> {
  const all = await getAllFolders();
  return all.filter(filter);
}

export async function countFolders(
  filter: (f: FolderRecord) => boolean,
): Promise<number> {
  const all = await getAllFolders();
  return all.filter(filter).length;
}

export async function createFolder(data: Omit<FolderRecord, 'id'>): Promise<FolderRecord> {
  const all = await getAllFolders();
  const record: FolderRecord = { id: generateId(), ...data };
  all.push(record);
  await saveAll(FOLDERS_KEY, all);
  return record;
}

export async function updateFolder(
  id: string,
  updater: (f: FolderRecord) => FolderRecord,
): Promise<FolderRecord | undefined> {
  const all = await getAllFolders();
  const idx = all.findIndex((f) => f.id === id);
  if (idx === -1) return undefined;
  all[idx] = updater({ ...all[idx] });
  await saveAll(FOLDERS_KEY, all);
  return all[idx];
}

export async function deleteFolderPermanently(id: string): Promise<void> {
  const all = await getAllFolders();
  await saveAll(FOLDERS_KEY, all.filter((f) => f.id !== id));
}

// ----- Sync Log -----

export async function createSyncLog(data: Omit<SyncLogRecord, 'id'>): Promise<SyncLogRecord> {
  const all = await getAll<SyncLogRecord>(SYNC_LOG_KEY);
  const record: SyncLogRecord = { id: generateId(), ...data };
  all.push(record);
  const trimmed = all.length > 200 ? all.slice(-200) : all;
  await saveAll(SYNC_LOG_KEY, trimmed);
  return record;
}

// ----- Sync Utilities -----

export async function markAllRecordsForResync(): Promise<void> {
  const now = Date.now();

  const prompts = await getAllPrompts();
  const rebasedPrompts = prompts.map((p) => {
    if (p.syncStatus === 'deleted') {
      return p;
    }

    return {
      ...p,
      serverId: '',
      syncStatus: 'created',
      lastSyncedAt: null,
      updatedAt: now,
    };
  });
  await saveAll(PROMPTS_KEY, rebasedPrompts);

  const folders = await getAllFolders();
  const rebasedFolders = folders.map((f) => {
    if (f.syncStatus === 'deleted') {
      return f;
    }

    return {
      ...f,
      serverId: '',
      syncStatus: 'created',
      lastSyncedAt: null,
    };
  });
  await saveAll(FOLDERS_KEY, rebasedFolders);
}
