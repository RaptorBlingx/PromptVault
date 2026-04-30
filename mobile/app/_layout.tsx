// ============================================
// Root Layout - ThemeProvider + Init
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../src/theme';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useSyncStore } from '../src/stores/syncStore';
import { connectivityMonitor } from '../src/sync/connectivityMonitor';
import { registerBackgroundSync } from '../src/sync/backgroundSync';
import { syncEngine } from '../src/sync';
import { SyncStatusBar } from '../src/components/SyncStatusBar';
import { Toast, ToastData } from '../src/components/Toast';

function RootLayoutNav() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const updateConnectivity = useSyncStore((s) => s.updateConnectivity);
  const updatePhase = useSyncStore((s) => s.updatePhase);
  const refreshPendingCount = useSyncStore((s) => s.refreshPendingCount);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribeConnectivity: (() => void) | undefined;
    let unsubscribeSyncPhase: (() => void) | undefined;

    async function init() {
      await useSettingsStore.getState().initialize();
      await refreshPendingCount();

      unsubscribeConnectivity = connectivityMonitor.subscribe((status) => {
        updateConnectivity(status);
        if (status === 'online') {
          void useSyncStore.getState().triggerSync();
        }
      });

      unsubscribeSyncPhase = syncEngine.subscribe((phase, detail) => {
        updatePhase(phase, detail);
        if (phase === 'idle') {
          void refreshPendingCount();
        }
      });

      connectivityMonitor.start();
      registerBackgroundSync();

      if (!cancelled) {
        setReady(true);
      }
    }

    void init();

    return () => {
      cancelled = true;
      unsubscribeConnectivity?.();
      unsubscribeSyncPhase?.();
      connectivityMonitor.stop();
    };
  }, [refreshPendingCount, updateConnectivity, updatePhase]);

  useEffect(() => {
    if (ready) {
      router.replace('/(app)');
    }
  }, [ready, router]);

  if (!ready) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPrimary, paddingTop: insets.top }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.bgPrimary} />
      <SyncStatusBar />
      <Slot />
      <View style={[styles.toastContainer, { bottom: Math.max(insets.bottom + 16, 40) }]}>
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
  },
});
