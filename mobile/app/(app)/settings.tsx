// ============================================
// Settings Screen - theme, sync, auth, about
// ============================================

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../../src/theme';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { fontSize, fontWeight } from '../../src/theme/typography';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { useSyncStore } from '../../src/stores/syncStore';
import {
  checkHealth,
  normalizeServerUrl,
  setServerUrl as setApiClientServerUrl,
} from '../../src/api/client';

type ThemeOption = 'system' | 'light' | 'dark';
import { SortOption } from '../../src/shared/types';

export default function SettingsScreen() {
  const { colors } = useTheme();

  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const sortOption = useSettingsStore((s) => s.sortOption);
  const setSortOption = useSettingsStore((s) => s.setSortOption);
  const showWordCount = useSettingsStore((s) => s.showWordCount);
  const setShowWordCount = useSettingsStore((s) => s.setShowWordCount);
  const serverUrl = useSettingsStore((s) => s.serverUrl);
  const setServerUrl = useSettingsStore((s) => s.setServerUrl);

  const syncStatus = useSyncStore((s) => s.status);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const pendingChanges = useSyncStore((s) => s.pendingChanges);
  const triggerSync = useSyncStore((s) => s.triggerSync);

  const [serverUrlInput, setServerUrlInput] = useState(serverUrl);
  const [isSavingServerUrl, setIsSavingServerUrl] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const themeOptions: { key: ThemeOption; label: string }[] = [
    { key: 'system', label: 'System' },
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' },
  ];

  const sortOptions: { key: SortOption; label: string }[] = [
    { key: SortOption.NEWEST, label: 'Newest' },
    { key: SortOption.OLDEST, label: 'Oldest' },
    { key: SortOption.AZ, label: 'A-Z' },
    { key: SortOption.PINNED, label: 'Pinned First' },
  ];

  const syncStatusLabel = (() => {
    switch (syncStatus) {
      case 'synced':
        return 'Synced';
      case 'syncing':
        return 'Syncing...';
      case 'offline':
        return 'Offline';
      default:
        return 'Error';
    }
  })();

  const getApiPortFallbackUrl = useCallback((url: string): string | null => {
    try {
      const parsed = new URL(url);
      if (parsed.port !== '2528') {
        return null;
      }
      parsed.port = '2529';
      return parsed.toString().replace(/\/$/, '');
    } catch {
      return null;
    }
  }, []);

  const runSyncAndReport = useCallback(
    async (url: string, connectedTitle: string) => {
      await triggerSync();
      const { error, pendingChanges: remainingChanges } = useSyncStore.getState();

      if (!error && remainingChanges === 0) {
        Alert.alert(connectedTitle, `Connected to: ${url}`);
        return;
      }

      Alert.alert(
        'Server Reachable',
        error || `${remainingChanges} pending change${remainingChanges === 1 ? '' : 's'} remain unsynced.`,
      );
    },
    [triggerSync],
  );

  const handleSaveServerUrl = useCallback(async () => {
    if (isSavingServerUrl) {
      return;
    }

    const normalizedUrl = normalizeServerUrl(serverUrlInput);
    setIsSavingServerUrl(true);

    try {
      await setServerUrl(normalizedUrl);
      setServerUrlInput(normalizedUrl);

      try {
        await checkHealth();
        await runSyncAndReport(normalizedUrl, 'Server Connected');
        return;
      } catch (initialError) {
        const fallbackUrl = getApiPortFallbackUrl(normalizedUrl);

        if (fallbackUrl && fallbackUrl !== normalizedUrl) {
          setApiClientServerUrl(fallbackUrl);
          try {
            await checkHealth();
            await setServerUrl(fallbackUrl);
            setServerUrlInput(fallbackUrl);
            await runSyncAndReport(fallbackUrl, 'Server URL Adjusted');
            return;
          } catch {
            setApiClientServerUrl(normalizedUrl);
          }
        }

        const errorMessage =
          initialError instanceof Error
            ? initialError.message
            : 'Unknown network error';

        Alert.alert(
          'Unable to Reach API',
          `Could not connect to ${normalizedUrl}/api/health.\n\n${errorMessage}\n\nUse your API endpoint, usually port 2529.`,
        );
      }
    } catch (error) {
      Alert.alert(
        'Unable to Update Server URL',
        error instanceof Error
          ? error.message
          : 'Failed to update the server URL. Check the address and try again.',
      );
    } finally {
      setIsSavingServerUrl(false);
    }
  }, [
    getApiPortFallbackUrl,
    isSavingServerUrl,
    runSyncAndReport,
    serverUrlInput,
    setServerUrl,
  ]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: spacing[10] }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Theme</Text>
          <View style={styles.optionRow}>
            {themeOptions.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => void setTheme(opt.key)}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor: theme === opt.key ? colors.accent : colors.bgTertiary,
                    borderColor: theme === opt.key ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: theme === opt.key ? '#ffffff' : colors.textSecondary,
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.medium,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.switchRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Show Word Count</Text>
            <Switch
              value={showWordCount}
              onValueChange={(value) => void setShowWordCount(value)}
              trackColor={{ false: colors.border, true: colors.accent }}
            />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Sorting</Text>
        <View style={[styles.card, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
          <View style={styles.optionRow}>
            {sortOptions.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setSortOption(opt.key)}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor: sortOption === opt.key ? colors.accent : colors.bgTertiary,
                    borderColor: sortOption === opt.key ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: sortOption === opt.key ? '#ffffff' : colors.textSecondary,
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.medium,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Sync</Text>
        <View style={[styles.card, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{syncStatusLabel}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Pending Changes</Text>
            <Text style={[styles.infoValue, { color: pendingChanges > 0 ? colors.warning : colors.textPrimary }]}>
              {pendingChanges}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Last Sync</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Never'}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            onPress={() => void triggerSync()}
            disabled={syncStatus === 'syncing'}
            style={styles.actionRow}
          >
            <Text style={[styles.actionText, { color: syncStatus === 'syncing' ? colors.textTertiary : colors.accent }]}>
              Sync Now
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Server</Text>
        <View style={[styles.card, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Server URL</Text>
          <View style={styles.serverRow}>
            <TextInput
              style={[styles.serverInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bgTertiary }]}
              value={serverUrlInput}
              onChangeText={setServerUrlInput}
              placeholder="http://your-server:2529"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onFocus={() => {
                setTimeout(() => {
                  scrollRef.current?.scrollToEnd({ animated: true });
                }, 150);
              }}
            />
            <TouchableOpacity
              onPress={() => void handleSaveServerUrl()}
              disabled={isSavingServerUrl}
              style={[
                styles.saveUrlButton,
                {
                  backgroundColor: isSavingServerUrl ? colors.textTertiary : colors.accent,
                },
              ]}
            >
              <Text style={styles.saveUrlText}>{isSavingServerUrl ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>About</Text>
        <View style={[styles.card, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Version</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>1.0.0</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Platform</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>React Native + Expo</Text>
          </View>
        </View>

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing[3],
    marginTop: spacing[4],
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing[4],
    marginBottom: spacing[2],
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing[2],
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  optionChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginVertical: spacing[3],
  },
  actionRow: {
    paddingVertical: spacing[1],
  },
  actionText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoValue: {
    fontSize: fontSize.sm,
  },
  serverRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  serverInput: {
    flex: 1,
    fontSize: fontSize.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  saveUrlButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    justifyContent: 'center',
  },
  saveUrlText: {
    color: '#ffffff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
