// ============================================
// PromptVault Mobile - Settings Store
// ============================================

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Theme, SortOption } from '../shared/types';
import {
  setServerUrl,
  normalizeServerUrl,
} from '../api/client';
import { markAllRecordsForResync } from '../db';

const SETTINGS_KEY = 'promptvault_settings';

interface SettingsState {
  theme: Theme;
  sortOption: SortOption;
  showWordCount: boolean;
  serverUrl: string;
  defaultFolderId: string | null;
  setTheme: (theme: Theme) => Promise<void>;
  setSortOption: (sort: SortOption) => void;
  setShowWordCount: (show: boolean) => Promise<void>;
  setServerUrl: (url: string) => Promise<void>;
  setDefaultFolderId: (id: string | null) => Promise<void>;
  initialize: () => Promise<void>;
}

async function persistSettings(state: Partial<SettingsState>) {
  const current = await loadSettings();
  const merged = { ...current, ...state };
  await SecureStore.setItemAsync(
    SETTINGS_KEY,
    JSON.stringify({
      theme: merged.theme,
      sortOption: merged.sortOption,
      showWordCount: merged.showWordCount,
      serverUrl: merged.serverUrl,
      defaultFolderId: merged.defaultFolderId,
    }),
  );
}

async function loadSettings(): Promise<Partial<SettingsState>> {
  try {
    const raw = await SecureStore.getItemAsync(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return {};
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'system',
  sortOption: SortOption.NEWEST,
  showWordCount: true,
  serverUrl: 'http://localhost:2529',
  defaultFolderId: null,

  setTheme: async (theme) => {
    set({ theme });
    await persistSettings({ theme });
  },

  setSortOption: (sortOption) => {
    set({ sortOption });
  },

  setShowWordCount: async (showWordCount) => {
    set({ showWordCount });
    await persistSettings({ showWordCount });
  },

  setServerUrl: async (url) => {
    const normalizedUrl = normalizeServerUrl(url);
    const previousUrl = normalizeServerUrl(get().serverUrl || '');

    if (normalizedUrl !== previousUrl) {
      // When switching backend endpoints, force local records to be re-pushed so
      // a wrong or empty server does not cause local content to be pruned.
      await markAllRecordsForResync();
    }

    setServerUrl(normalizedUrl);
    set({ serverUrl: normalizedUrl });
    await persistSettings({ serverUrl: normalizedUrl });
  },

  setDefaultFolderId: async (id) => {
    set({ defaultFolderId: id });
    await persistSettings({ defaultFolderId: id });
  },

  initialize: async () => {
    const saved = await loadSettings();

    const savedServerUrl = saved.serverUrl
      ? normalizeServerUrl(saved.serverUrl)
      : 'http://localhost:2529';

    setServerUrl(savedServerUrl);

    set({
      theme: saved.theme || 'system',
      sortOption: saved.sortOption || SortOption.NEWEST,
      showWordCount: saved.showWordCount ?? true,
      serverUrl: savedServerUrl,
      defaultFolderId: saved.defaultFolderId || null,
    });
  },
}));
