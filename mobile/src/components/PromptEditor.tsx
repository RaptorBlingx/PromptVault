// ============================================
// PromptVault Mobile - Prompt Editor Component
// Matches web DetailView — title + content editor,
// tags, folder, settings, version history
// ============================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme } from '../theme';
import { spacing, borderRadius } from '../theme/spacing';
import { fontSize, fontWeight } from '../theme/typography';
import {
  Prompt,
  PromptVersion,
  Folder,
  MAX_VERSIONS,
} from '../shared/types';
import { extractVariables } from '../shared/variables';
import { countWords, countCharacters, generateId } from '../shared/utils';

interface PromptEditorProps {
  prompt: Prompt;
  folders: Folder[];
  showWordCount?: boolean;
  onSave: (updates: Partial<Prompt>) => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onFillVariables?: () => void;
}

export function PromptEditor({
  prompt,
  folders,
  showWordCount = true,
  onSave,
  onDelete,
  onCopy,
  onFillVariables,
}: PromptEditorProps) {
  const { colors } = useTheme();
  const [title, setTitle] = useState(prompt.title);
  const [content, setContent] = useState(prompt.content);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(prompt.tags);
  const [folderId, setFolderId] = useState<string | null>(prompt.folderId);
  const [isFavorite, setIsFavorite] = useState(prompt.isFavorite);
  const [isPinned, setIsPinned] = useState(prompt.isPinned);
  const [showVersions, setShowVersions] = useState(false);

  const wordCount = useMemo(() => countWords(content), [content]);
  const charCount = useMemo(() => countCharacters(content), [content]);
  const variables = useMemo(() => extractVariables(content), [content]);

  const hasChanged =
    title !== prompt.title ||
    content !== prompt.content ||
    JSON.stringify(tags) !== JSON.stringify(prompt.tags) ||
    folderId !== prompt.folderId ||
    isFavorite !== prompt.isFavorite ||
    isPinned !== prompt.isPinned;

  const handleSave = useCallback(() => {
    // Create version history entry if content changed
    let newVersions = [...prompt.versions];
    if (content !== prompt.content && prompt.content.length > 0) {
      newVersions = [
        {
          id: generateId(),
          title: prompt.title,
          content: prompt.content,
          savedAt: Date.now(),
        },
        ...newVersions,
      ].slice(0, MAX_VERSIONS);
    }

    onSave({
      title,
      content,
      tags,
      folderId,
      isFavorite,
      isPinned,
      versions: newVersions,
    });
  }, [title, content, tags, folderId, isFavorite, isPinned, prompt, onSave]);

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleRestoreVersion = (version: PromptVersion) => {
    Alert.alert(
      'Restore Version',
      `Restore "${version.title}" from ${new Date(version.savedAt).toLocaleString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: () => {
            setTitle(version.title);
            setContent(version.content);
          },
        },
      ],
    );
  };

  const selectedFolder = folders.find((f) => f.id === folderId);

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Action Bar */}
      <View style={[styles.actionBar, { borderBottomColor: colors.border }]}>
        <View style={styles.actionGroup}>
          <TouchableOpacity
            onPress={() => setIsPinned(!isPinned)}
            style={[styles.actionButton, isPinned && { backgroundColor: colors.accentBg }]}
          >
            <Text style={{ color: isPinned ? colors.accent : colors.textTertiary }}>
              📌
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsFavorite(!isFavorite)}
            style={[styles.actionButton, isFavorite && { backgroundColor: colors.warningBg }]}
          >
            <Text>{isFavorite ? '⭐' : '☆'}</Text>
          </TouchableOpacity>
          {onCopy && (
            <TouchableOpacity onPress={onCopy} style={styles.actionButton}>
              <Text style={{ color: colors.textTertiary }}>📋</Text>
            </TouchableOpacity>
          )}
          {variables.length > 0 && onFillVariables && (
            <TouchableOpacity onPress={onFillVariables} style={styles.actionButton}>
              <Text style={{ color: colors.accent }}>⚡</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.actionGroup}>
          {hasChanged && (
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveButton, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={() =>
                Alert.alert('Delete Prompt', 'Are you sure?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: onDelete },
                ])
              }
              style={styles.actionButton}
            >
              <Text style={{ color: colors.error }}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Title */}
      <TextInput
        style={[styles.titleInput, { color: colors.textPrimary }]}
        value={title}
        onChangeText={setTitle}
        placeholder="Prompt title..."
        placeholderTextColor={colors.textTertiary}
        maxLength={200}
      />

      {/* Folder Selector */}
      <TouchableOpacity
        style={[styles.folderSelector, { backgroundColor: colors.bgTertiary, borderColor: colors.border }]}
        onPress={() => {
          // Cycle through folders + null
          const folderIds = [null, ...folders.map((f) => f.id)];
          const currentIndex = folderIds.indexOf(folderId);
          const nextIndex = (currentIndex + 1) % folderIds.length;
          setFolderId(folderIds[nextIndex]);
        }}
      >
        <Text style={[styles.folderLabel, { color: colors.textTertiary }]}>
          {selectedFolder ? `${selectedFolder.icon} ${selectedFolder.name}` : '📁 No folder'}
        </Text>
      </TouchableOpacity>

      {/* Content */}
      <TextInput
        style={[
          styles.contentInput,
          {
            color: colors.textPrimary,
            backgroundColor: colors.bgSecondary,
            borderColor: colors.border,
          },
        ]}
        value={content}
        onChangeText={setContent}
        placeholder="Write your prompt here..."
        placeholderTextColor={colors.textTertiary}
        multiline
        textAlignVertical="top"
      />

      {/* Word/Char Count */}
      {showWordCount && (
        <View style={styles.statsRow}>
          <Text style={[styles.statsText, { color: colors.textTertiary }]}>
            {wordCount} words · {charCount} characters
          </Text>
          {variables.length > 0 && (
            <Text style={[styles.statsText, { color: colors.accent }]}>
              ⚡ {variables.length} variable{variables.length > 1 ? 's' : ''}
            </Text>
          )}
        </View>
      )}

      {/* Tags */}
      <View style={styles.tagsSection}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Tags</Text>
        <View style={styles.tagsContainer}>
          {tags.map((tag) => (
            <TouchableOpacity
              key={tag}
              onPress={() => handleRemoveTag(tag)}
              style={[styles.tagChip, { backgroundColor: colors.bgTertiary, borderColor: colors.border }]}
            >
              <Text style={[styles.tagChipText, { color: colors.textSecondary }]}>
                {tag} ✕
              </Text>
            </TouchableOpacity>
          ))}
          <TextInput
            style={[styles.tagInput, { color: colors.textPrimary }]}
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={handleAddTag}
            placeholder="Add tag..."
            placeholderTextColor={colors.textTertiary}
            returnKeyType="done"
          />
        </View>
      </View>

      {/* Version History */}
      {prompt.versions.length > 0 && (
        <View style={styles.versionsSection}>
          <TouchableOpacity
            onPress={() => setShowVersions(!showVersions)}
            style={styles.versionHeader}
          >
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Version History ({prompt.versions.length})
            </Text>
            <Text style={{ color: colors.textTertiary }}>
              {showVersions ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
          {showVersions &&
            prompt.versions.map((version) => (
              <TouchableOpacity
                key={version.id}
                onPress={() => handleRestoreVersion(version)}
                style={[
                  styles.versionItem,
                  { backgroundColor: colors.bgTertiary, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.versionTitle, { color: colors.textPrimary }]}>
                  {version.title}
                </Text>
                <Text style={[styles.versionDate, { color: colors.textTertiary }]}>
                  {new Date(version.savedAt).toLocaleString()}
                </Text>
                <Text
                  style={[styles.versionPreview, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {version.content.substring(0, 100)}...
                </Text>
              </TouchableOpacity>
            ))}
        </View>
      )}

      {/* Bottom padding */}
      <View style={{ height: spacing[12] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  actionButton: {
    padding: spacing[2],
    borderRadius: borderRadius.md,
  },
  saveButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  titleInput: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  folderSelector: {
    marginHorizontal: spacing[4],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing[3],
  },
  folderLabel: {
    fontSize: fontSize.sm,
  },
  contentInput: {
    fontSize: fontSize.base,
    lineHeight: fontSize.base * 1.6,
    padding: spacing[4],
    marginHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minHeight: 200,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  statsText: {
    fontSize: fontSize.xs,
  },
  tagsSection: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing[2],
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    alignItems: 'center',
  },
  tagChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  tagChipText: {
    fontSize: fontSize.sm,
  },
  tagInput: {
    fontSize: fontSize.sm,
    minWidth: 80,
    padding: spacing[1],
  },
  versionsSection: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  versionItem: {
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing[2],
  },
  versionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  versionDate: {
    fontSize: fontSize.xs,
    marginTop: 2,
    marginBottom: spacing[1],
  },
  versionPreview: {
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * 1.5,
  },
});
