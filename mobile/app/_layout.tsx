// ============================================
// Root Layout — ThemeProvider + Init
// ============================================

import React, { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { ThemeProvider, useTheme } from '../src/theme';
import { useSettingsStore } from '../src/stores/settingsStore';
import { useSyncStore } from '../src/stores/syncStore';
import { connectivityMonitor } from '../src/sync/connectivityMonitor';
import { syncEngine } from '../src/sync/syncEngine';
import { registerBackgroundSync } from '../src/sync/backgroundSync';
import { SyncStatusBar } from '../src/components/SyncStatusBar';
import { Toast, ToastData } from '../src/components/Toast';

function RootLayoutNav() {
  const { colors } = useTheme();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Initialize stores on mount
  useEffect(() => {
    async function init() {
      await useSettingsStore.getState().initialize();
      await useSyncStore.getState().refreshPendingCount();
      connectivityMonitor.start();
      registerBackgroundSync();
      setReady(true);
    }
    init();

    return () => {
      connectivityMonitor.stop();
    };
  }, []);

  useEffect(() => {
    const unsubscribeConnectivity = connectivityMonitor.subscribe((status) => {
      const store = useSyncStore.getState();
      store.updateConnectivity(status);
      if (status === 'online') {
        store.triggerSync().catch(() => undefined);
      }
    });
    const unsubscribeSync = syncEngine.subscribe((phase, detail) => {
      useSyncStore.getState().updatePhase(phase, detail);
    });

    return () => {
      unsubscribeConnectivity();
      unsubscribeSync();
    };
  }, []);

  // Always go to app
  useEffect(() => {
    if (ready) {
      router.replace('/(app)');
    }
  }, [ready]);

  if (!ready) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bgPrimary }]}>
      <SyncStatusBar />
      <Slot />
      <View style={styles.toastContainer}>
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
    bottom: 40,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
});
