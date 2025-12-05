// ============================================
// PromptVault - Storage Service (API-backed)
// ============================================
// This service provides a unified interface for data persistence.
// It uses the API server for storage with localStorage as a fallback cache.

import { Prompt, Folder, createDefaultPrompt, createDefaultFolder } from '../types';
import * as api from './apiService';

const PROMPTS_CACHE_KEY = 'promptvault-prompts-cache';
const FOLDERS_CACHE_KEY = 'promptvault-folders-cache';
const VERSION_KEY = 'promptvault-version';
const CURRENT_VERSION = 2;

// ----- Cache Management -----

function getCachedPrompts(): Prompt[] {
  try {
    const raw = localStorage.getItem(PROMPTS_CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read prompts cache:', e);
    return [];
  }
}

function setCachedPrompts(prompts: Prompt[]): void {
  try {
    localStorage.setItem(PROMPTS_CACHE_KEY, JSON.stringify(prompts));
  } catch (e) {
    console.error('Failed to write prompts cache:', e);
  }
}

function getCachedFolders(): Folder[] {
  try {
    const raw = localStorage.getItem(FOLDERS_CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read folders cache:', e);
    return [];
  }
}

function setCachedFolders(folders: Folder[]): void {
  try {
    localStorage.setItem(FOLDERS_CACHE_KEY, JSON.stringify(folders));
  } catch (e) {
    console.error('Failed to write folders cache:', e);
  }
}

// ----- Data Migration -----
// Note: Migration from old localStorage format to API is handled by migrateLocalStorageToApi()

interface LegacyPrompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

function migrateToV2(legacyPrompts: LegacyPrompt[]): Prompt[] {
  return legacyPrompts.map(p => ({
    ...p,
    isPinned: false,
    folderId: null,
    versions: [],
  }));
}

// Check if there's old localStorage data and migrate to API
export async function migrateLocalStorageToApi(): Promise<boolean> {
  const OLD_PROMPTS_KEY = 'promptvault-prompts';
  const OLD_FOLDERS_KEY = 'promptvault-folders';

  const rawPrompts = localStorage.getItem(OLD_PROMPTS_KEY);
  const rawFolders = localStorage.getItem(OLD_FOLDERS_KEY);

  if (!rawPrompts && !rawFolders) {
    return false; // Nothing to migrate
  }

  try {
    let prompts: Prompt[] = [];
    let folders: Folder[] = [];

    if (rawPrompts) {
      const parsed = JSON.parse(rawPrompts);
      // Check if it's legacy format (no isPinned field)
      if (parsed.length > 0 && parsed[0].isPinned === undefined) {
        prompts = migrateToV2(parsed);
      } else {
        prompts = parsed;
      }
    }

    if (rawFolders) {
      folders = JSON.parse(rawFolders);
    }

    // Import to API
    if (prompts.length > 0 || folders.length > 0) {
      await api.importDataApi(prompts, folders);

      // Clear old localStorage data (keep as backup with different key)
      localStorage.setItem('promptvault-migrated-prompts-backup', rawPrompts || '[]');
      localStorage.setItem('promptvault-migrated-folders-backup', rawFolders || '[]');
      localStorage.removeItem(OLD_PROMPTS_KEY);
      localStorage.removeItem(OLD_FOLDERS_KEY);

      console.log(`Migrated ${prompts.length} prompts and ${folders.length} folders to API`);
      return true;
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }

  return false;
}

// ----- Prompts (API-backed) -----

export async function loadPromptsAsync(): Promise<Prompt[]> {
  try {
    const prompts = await api.fetchPrompts();
    // Update cache
    setCachedPrompts(prompts);
    // Ensure all prompts have required fields
    return prompts.map(p => ({
      ...createDefaultPrompt(),
      ...p,
    }));
  } catch (error) {
    console.error('Failed to fetch prompts from API, using cache:', error);
    // Fall back to cache
    return getCachedPrompts().map(p => ({
      ...createDefaultPrompt(),
      ...p,
    }));
  }
}

export async function savePromptAsync(prompt: Prompt): Promise<Prompt> {
  try {
    // Check if prompt exists
    const existing = getCachedPrompts().find(p => p.id === prompt.id);

    let saved: Prompt;
    if (existing) {
      saved = await api.updatePromptApi(prompt.id, prompt);
    } else {
      saved = await api.createPromptApi(prompt);
    }

    // Update cache
    const cached = getCachedPrompts();
    const index = cached.findIndex(p => p.id === saved.id);
    if (index >= 0) {
      cached[index] = saved;
    } else {
      cached.push(saved);
    }
    setCachedPrompts(cached);

    return saved;
  } catch (error) {
    console.error('Failed to save prompt to API:', error);
    throw error;
  }
}

export async function deletePromptAsync(id: string): Promise<void> {
  try {
    await api.deletePromptApi(id);

    // Update cache
    const cached = getCachedPrompts().filter(p => p.id !== id);
    setCachedPrompts(cached);
  } catch (error) {
    console.error('Failed to delete prompt from API:', error);
    throw error;
  }
}

// Synchronous versions for backward compatibility (use cache)
export function loadPrompts(): Prompt[] {
  return getCachedPrompts().map(p => ({
    ...createDefaultPrompt(),
    ...p,
  }));
}

export function savePrompts(prompts: Prompt[]): void {
  setCachedPrompts(prompts);
  // Optionally sync to API in background
  // This is called frequently, so we don't want to block
}

// ----- Folders (API-backed) -----

export async function loadFoldersAsync(): Promise<Folder[]> {
  try {
    const folders = await api.fetchFolders();
    setCachedFolders(folders);
    return folders;
  } catch (error) {
    console.error('Failed to fetch folders from API, using cache:', error);
    return getCachedFolders();
  }
}

export async function saveFolderAsync(folder: Folder): Promise<Folder> {
  try {
    const existing = getCachedFolders().find(f => f.id === folder.id);

    let saved: Folder;
    if (existing) {
      saved = await api.updateFolderApi(folder.id, folder);
    } else {
      saved = await api.createFolderApi(folder);
    }

    // Update cache
    const cached = getCachedFolders();
    const index = cached.findIndex(f => f.id === saved.id);
    if (index >= 0) {
      cached[index] = saved;
    } else {
      cached.push(saved);
    }
    setCachedFolders(cached);

    return saved;
  } catch (error) {
    console.error('Failed to save folder to API:', error);
    throw error;
  }
}

export async function deleteFolderAsync(id: string): Promise<void> {
  try {
    await api.deleteFolderApi(id);

    // Update cache
    const cached = getCachedFolders().filter(f => f.id !== id);
    setCachedFolders(cached);
  } catch (error) {
    console.error('Failed to delete folder from API:', error);
    throw error;
  }
}

// Synchronous versions for backward compatibility
export function loadFolders(): Folder[] {
  return getCachedFolders();
}

export function saveFolders(folders: Folder[]): void {
  setCachedFolders(folders);
}

// ----- Export / Import -----

export interface ExportData {
  version: number;
  exportedAt: number;
  prompts: Prompt[];
  folders: Folder[];
}

export function exportData(prompts: Prompt[], folders: Folder[]): string {
  const data: ExportData = {
    version: CURRENT_VERSION,
    exportedAt: Date.now(),
    prompts,
    folders,
  };
  return JSON.stringify(data, null, 2);
}

export function importData(jsonString: string): { prompts: Prompt[]; folders: Folder[] } | null {
  try {
    const data = JSON.parse(jsonString);

    // Handle legacy format (just array of prompts)
    if (Array.isArray(data)) {
      return {
        prompts: migrateToV2(data),
        folders: [],
      };
    }

    // Handle new format
    if (data.prompts && Array.isArray(data.prompts)) {
      const prompts = data.version < 2
        ? migrateToV2(data.prompts)
        : data.prompts;

      return {
        prompts,
        folders: data.folders || [],
      };
    }

    return null;
  } catch (e) {
    console.error('Import failed:', e);
    return null;
  }
}

// Async version that syncs with API
export async function importDataToApi(jsonString: string): Promise<boolean> {
  const parsed = importData(jsonString);
  if (!parsed) return false;

  try {
    await api.importDataApi(parsed.prompts, parsed.folders);
    setCachedPrompts(parsed.prompts);
    setCachedFolders(parsed.folders);
    return true;
  } catch (error) {
    console.error('Failed to import to API:', error);
    return false;
  }
}

// ----- Import from Markdown -----

export function importFromMarkdown(filename: string, content: string): Prompt {
  const title = filename.replace(/\.md$/i, '');
  const now = Date.now();

  return {
    id: now.toString(),
    title,
    content,
    tags: [],
    isFavorite: false,
    isPinned: false,
    folderId: null,
    createdAt: now,
    updatedAt: now,
    versions: [],
  };
}

// ----- Utility -----

export function duplicatePrompt(prompt: Prompt): Prompt {
  const now = Date.now();
  return {
    ...prompt,
    id: now.toString(),
    title: `${prompt.title} (Copy)`,
    createdAt: now,
    updatedAt: now,
    versions: [],
  };
}

export function createPromptVersion(prompt: Prompt): Prompt {
  const version = {
    id: Date.now().toString(),
    title: prompt.title,
    content: prompt.content,
    savedAt: Date.now(),
  };

  // Keep only last 5 versions
  const versions = [version, ...prompt.versions].slice(0, 5);

  return {
    ...prompt,
    versions,
  };
}
