// ============================================
// PromptVault Mobile - Folder List Component
// Matches web Sidebar folder tree
// ============================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useTheme } from '../theme';
import { spacing, borderRadius } from '../theme/spacing';
import { fontSize, fontWeight } from '../theme/typography';
import { Folder } from '../shared/types';

interface FolderListProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder?: () => void;
  onEditFolder?: (folder: Folder) => void;
  onDeleteFolder?: (folder: Folder) => void;
}

export function FolderList({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
}: FolderListProps) {
  const { colors } = useTheme();

  const renderItem = ({ item }: { item: Folder }) => {
    const isSelected = selectedFolderId === item.id;
    return (
      <TouchableOpacity
        onPress={() => onSelectFolder(item.id)}
        onLongPress={() => onEditFolder?.(item)}
        style={[
          styles.folderItem,
          {
            backgroundColor: isSelected ? colors.accentBg : 'transparent',
            borderColor: isSelected ? colors.accentBorder : 'transparent',
          },
        ]}
        activeOpacity={0.7}
      >
        <Text style={styles.folderIcon}>{item.icon}</Text>
        <Text
          style={[
            styles.folderName,
            {
              color: isSelected ? colors.accent : colors.textPrimary,
              fontWeight: isSelected ? fontWeight.semibold : fontWeight.normal,
            },
          ]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <View
          style={[styles.colorDot, { backgroundColor: item.color }]}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* All Prompts */}
      <TouchableOpacity
        onPress={() => onSelectFolder(null)}
        style={[
          styles.folderItem,
          {
            backgroundColor:
              selectedFolderId === null ? colors.accentBg : 'transparent',
            borderColor:
              selectedFolderId === null ? colors.accentBorder : 'transparent',
          },
        ]}
        activeOpacity={0.7}
      >
        <Text style={styles.folderIcon}>📋</Text>
        <Text
          style={[
            styles.folderName,
            {
              color:
                selectedFolderId === null ? colors.accent : colors.textPrimary,
              fontWeight:
                selectedFolderId === null ? fontWeight.semibold : fontWeight.normal,
            },
          ]}
        >
          All Prompts
        </Text>
      </TouchableOpacity>

      {/* Folder list */}
      <FlatList
        data={folders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
      />

      {/* Create folder */}
      {onCreateFolder && (
        <TouchableOpacity
          onPress={onCreateFolder}
          style={styles.createButton}
          activeOpacity={0.7}
        >
          <Text style={[styles.createIcon, { color: colors.accent }]}>+</Text>
          <Text style={[styles.createText, { color: colors.accent }]}>
            New Folder
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[2],
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginHorizontal: spacing[2],
    marginBottom: spacing[1],
  },
  folderIcon: {
    fontSize: fontSize.base,
    marginRight: spacing[3],
  },
  folderName: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    marginHorizontal: spacing[2],
    marginTop: spacing[2],
  },
  createIcon: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginRight: spacing[2],
  },
  createText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
