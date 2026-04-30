// ============================================
// (app) Group Layout — Drawer navigation wrapper
// ============================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { useTheme } from '../../src/theme';
import { spacing } from '../../src/theme/spacing';
import { fontSize, fontWeight } from '../../src/theme/typography';
import { useSyncStore } from '../../src/stores/syncStore';

const DRAWER_WIDTH = 280;

export default function AppLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = React.useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = React.useRef(new Animated.Value(0)).current;

  const pendingChanges = useSyncStore((s) => s.pendingChanges);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.timing(drawerAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0.5,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(drawerAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setDrawerOpen(false));
  }, []);

  const navigateTo = (path: string) => {
    closeDrawer();
    setTimeout(() => router.push(path as any), 200);
  };

  const navItems = [
    { path: '/(app)', label: 'Prompts', icon: '📝' },
    { path: '/(app)/search', label: 'Search', icon: '🔍' },
    { path: '/(app)/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Main content with header */}
      <View style={styles.main}>
        {/* Header bar */}
        <View style={[styles.header, { backgroundColor: colors.bgSecondary, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
            <Text style={[styles.menuIcon, { color: colors.textPrimary }]}>☰</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            PromptVault
          </Text>
          <View style={styles.headerRight}>
            {pendingChanges > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                <Text style={styles.badgeText}>{pendingChanges}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => router.push('/(app)/search' as any)}
              style={styles.headerButton}
            >
              <Text style={{ color: colors.textSecondary }}>🔍</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Slot />
      </View>

      {/* Drawer overlay */}
      {drawerOpen && (
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: overlayAnim }]}
          />
        </Pressable>
      )}

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: colors.bgSecondary,
            borderRightColor: colors.border,
            transform: [{ translateX: drawerAnim }],
          },
        ]}
      >
        {/* Drawer header */}
        <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.drawerTitle, { color: colors.accent }]}>PromptVault</Text>
          <Text style={[styles.drawerSubtitle, { color: colors.textTertiary }]}>
            Your prompts, everywhere
          </Text>
        </View>

        {/* Nav items */}
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path === '/(app)' && pathname === '/');
          return (
            <TouchableOpacity
              key={item.path}
              onPress={() => navigateTo(item.path)}
              style={[
                styles.navItem,
                isActive && { backgroundColor: colors.accentBg },
              ]}
            >
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text
                style={[
                  styles.navLabel,
                  { color: isActive ? colors.accent : colors.textSecondary },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Version */}
        <View style={styles.drawerFooter}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            PromptVault Mobile v1.0.0
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  main: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  menuButton: {
    padding: spacing[2],
  },
  menuIcon: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    flex: 1,
    marginLeft: spacing[2],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerButton: {
    padding: spacing[2],
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: fontWeight.bold,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    borderRightWidth: 1,
    zIndex: 100,
    elevation: 16,
  },
  drawerHeader: {
    paddingTop: 60,
    paddingBottom: spacing[4],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
  },
  drawerTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  drawerSubtitle: {
    fontSize: fontSize.sm,
    marginTop: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  navIcon: {
    fontSize: 18,
  },
  navLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  drawerFooter: {
    position: 'absolute',
    bottom: 40,
    left: spacing[4],
    right: spacing[4],
  },
  footerText: {
    fontSize: fontSize.xs,
  },
});
