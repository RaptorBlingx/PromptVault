// ============================================
// Prompt List Screen — Main home screen
// FlatList with pull-to-refresh, FAB, folders
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../src/theme';
import { spacing, shadows } from '../../src/theme/spacing';
import { fontSize, fontWeight } from '../../src/theme/typography';
import {
  getAllPrompts, getAllFolders, createPrompt,
  type PromptRecord, type FolderRecord,
} from '../../src/db';
import { PromptCard } from '../../src/components/PromptCard';
import { FolderList } from '../../src/components/FolderList';
import { SearchBar } from '../../src/components/SearchBar';
import { useSyncStore } from '../../src/stores/syncStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { Prompt, Folder, SortOption } from '../../src/shared/types';
import * as Clipboard from 'expo-clipboard';

export default function PromptListScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [prompts, setPrompts] = useState<PromptRecord[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showFolders, setShowFolders] = useState(true);

  const sortOption = useSettingsStore((s) => s.sortOption);
  const triggerSync = useSyncStore((s) => s.triggerSync);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);

  // Load data from AsyncStorage
  const loadData = useCallback(async () => {
    try {
      const allPrompts = await getAllPrompts();
      const allFolders = await getAllFolders();

      // Filter out deleted
      setPrompts(allPrompts.filter((p) => p.syncStatus !== 'deleted'));
      setFolders(allFolders.filter((f) => f.syncStatus !== 'deleted'));
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  useEffect(() => {
    if (lastSyncedAt) {
      void loadData();
    }
  }, [lastSyncedAt, loadData]);

  // Pull to refresh — sync then reload
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await triggerSync();
    } catch (error) {
      console.warn('Refresh sync failed:', error);
    }
    await loadData();
    setRefreshing(false);
  }, [triggerSync, loadData]);

  // Filtered & sorted prompts
  const displayPrompts = useMemo(() => {
    let filtered = prompts;

    // Folder filter
    if (selectedFolderId) {
      filtered = filtered.filter((p) => p.folderId === selectedFolderId);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          (p.tags && JSON.parse(p.tags).some((t: string) => t.toLowerCase().includes(q))),
      );
    }

    // Sort
    const sorted = [...filtered];
    switch (sortOption) {
      case SortOption.NEWEST:
        sorted.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case SortOption.OLDEST:
        sorted.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case SortOption.AZ:
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case SortOption.PINNED:
        sorted.sort((a, b) => b.updatedAt - a.updatedAt);
        break;
    }

    // Pinned first
    sorted.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

    return sorted;
  }, [prompts, selectedFolderId, searchQuery, sortOption]);

  // Create new prompt
  const handleCreatePrompt = useCallback(async () => {
    try {
      const newPrompt = await createPrompt({
        serverId: '',
        title: 'New Prompt',
        content: '',
        tags: '[]',
        isFavorite: false,
        isPinned: false,
        folderId: selectedFolderId || null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        versions: '[]',
        syncStatus: 'created',
        lastSyncedAt: null,
      });
      await loadData();
      router.push(`/(app)/${newPrompt.id}` as any);
    } catch (err) {
      console.error('Failed to create prompt:', err);
    }
  }, [selectedFolderId, loadData, router]);

  // Copy prompt content
  const handleCopy = useCallback(async (prompt: PromptRecord) => {
    await Clipboard.setStringAsync(prompt.content);
  }, []);

  // Create folder
  const handleCreateFolder = useCallback(async () => {
    // Alert.prompt is iOS-only, skip on Android
  }, []);

  // Convert record to card-friendly format
  const toCardData = (p: PromptRecord): Prompt => ({
    id: p.id,
    title: p.title,
    content: p.content,
    tags: JSON.parse(p.tags || '[]'),
    isFavorite: p.isFavorite,
    isPinned: p.isPinned,
    folderId: p.folderId || null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    versions: JSON.parse(p.versions || '[]'),
  });

  const toFolderData = (f: FolderRecord): Folder => ({
    id: f.id,
    name: f.name,
    icon: f.icon,
    color: f.color,
    createdAt: f.createdAt,
  });

  const renderPrompt = ({ item }: { item: PromptRecord }) => (
    <PromptCard
      prompt={toCardData(item)}
      syncStatus={(item.syncStatus as any) || 'synced'}
      onPress={() => router.push(`/(app)/${item.id}` as any)}
      onCopy={() => handleCopy(item)}
    />
  );

  const folderData = folders.map(toFolderData);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search prompts..."
        />
      </View>

      {/* Folders toggle */}
      <TouchableOpacity
        onPress={() => setShowFolders(!showFolders)}
        style={styles.folderToggle}
      >
        <Text style={[styles.folderToggleText, { color: colors.textTertiary }]}>
          {showFolders ? '▼' : '▶'} Folders
        </Text>
      </TouchableOpacity>

      {/* Folders */}
      {showFolders && (
        <FolderList
          folders={folderData}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onCreateFolder={handleCreateFolder}
        />
      )}

      {/* Prompt count */}
      <View style={styles.countRow}>
        <Text style={[styles.countText, { color: colors.textTertiary }]}>
          {displayPrompts.length} prompt{displayPrompts.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Prompt list */}
      <FlatList
        data={displayPrompts}
        renderItem={renderPrompt}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyIcon]}>📝</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? 'No prompts match your search' : 'No prompts yet'}
            </Text>
            <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
              {searchQuery ? 'Try a different search term' : 'Tap + to create your first prompt'}
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={handleCreatePrompt}
        style={[styles.fab, { backgroundColor: colors.accent }, shadows.xl]}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  folderToggle: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  folderToggleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  countRow: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  countText: {
    fontSize: fontSize.xs,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: 100,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing[12],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing[4],
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  emptyHint: {
    fontSize: fontSize.sm,
    marginTop: spacing[2],
  },
  fab: {
    position: 'absolute',
    right: spacing[4],
    bottom: spacing[6],
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: fontWeight.light,
    lineHeight: 30,
  },
});
