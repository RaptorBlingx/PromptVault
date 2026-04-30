// ============================================
// PromptVault Mobile - Toast Component
// ============================================

import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../theme';
import { borderRadius, spacing } from '../theme/spacing';
import { fontSize, fontWeight } from '../theme/typography';

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => onDismiss(toast.id));
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const bgColor =
    toast.type === 'success'
      ? colors.successBg
      : toast.type === 'error'
        ? colors.errorBg
        : colors.accentBg;

  const textColor =
    toast.type === 'success'
      ? colors.success
      : toast.type === 'error'
        ? colors.error
        : colors.accent;

  const icon =
    toast.type === 'success' ? '✓' : toast.type === 'error' ? '✗' : 'ℹ';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          borderColor: textColor,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={[styles.icon, { color: textColor }]}>{icon}</Text>
      <Text style={[styles.message, { color: colors.textPrimary }]} numberOfLines={2}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing[2],
    marginHorizontal: spacing[4],
  },
  icon: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginRight: spacing[2],
  },
  message: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
