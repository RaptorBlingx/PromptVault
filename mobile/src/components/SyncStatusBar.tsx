// ============================================
// PromptVault Mobile - Sync Status Bar
// Shows connectivity & sync state (like Google Keep)
// ============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';
import { spacing } from '../theme/spacing';
import { fontSize, fontWeight } from '../theme/typography';
import { useSyncStore } from '../stores/syncStore';

export function SyncStatusBar() {
  const { colors } = useTheme();
  const { status, pendingChanges, error, triggerSync } = useSyncStore();

  // Don't show anything when synced and online
  if (status === 'synced' && pendingChanges === 0) return null;

  const config = {
    synced: {
      bg: colors.successBg,
      text: colors.success,
      icon: '✓',
      label: 'All changes synced',
    },
    syncing: {
      bg: colors.accentBg,
      text: colors.accent,
      icon: '↻',
      label: 'Syncing...',
    },
    offline: {
      bg: colors.warningBg,
      text: colors.warning,
      icon: '⚡',
      label: pendingChanges > 0
        ? `Offline · ${pendingChanges} pending change${pendingChanges > 1 ? 's' : ''}`
        : 'You are offline',
    },
    error: {
      bg: colors.errorBg,
      text: colors.error,
      icon: '✗',
      label: error || 'Sync failed',
    },
  }[status];

  return (
    <TouchableOpacity
      onPress={status === 'error' || status === 'offline' ? triggerSync : undefined}
      activeOpacity={0.8}
    >
      <View style={[styles.bar, { backgroundColor: config.bg }]}>
        <Text style={[styles.icon, { color: config.text }]}>{config.icon}</Text>
        <Text style={[styles.label, { color: config.text }]}>{config.label}</Text>
        {(status === 'error' || status === 'offline') && (
          <Text style={[styles.retry, { color: config.text }]}>Tap to retry</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  icon: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginRight: spacing[2],
  },
  label: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  retry: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    opacity: 0.8,
  },
});
