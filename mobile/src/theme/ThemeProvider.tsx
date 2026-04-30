// ============================================
// PromptVault Mobile - Theme Provider
// ============================================

import React, { createContext, useContext } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { colors, ColorScheme } from './colors';
import { Theme } from '../shared/types';
import { useSettingsStore } from '../stores/settingsStore';

interface ThemeContextValue {
  theme: Theme;
  colorScheme: 'light' | 'dark';
  colors: ColorScheme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  colorScheme: 'light',
  colors: colors.light,
  setTheme: () => {},
  isDark: false,
});

type ThemeProviderProps = Readonly<{
  children: React.ReactNode;
  initialTheme?: Theme;
}>;

export function ThemeProvider({
  children,
  initialTheme = 'system',
}: ThemeProviderProps) {
  const systemColorScheme = useSystemColorScheme();
  const selectedTheme = useSettingsStore((s) => s.theme);
  const persistTheme = useSettingsStore((s) => s.setTheme);

  const theme = selectedTheme || initialTheme;

  const resolvedScheme: 'light' | 'dark' =
    theme === 'system'
      ? (systemColorScheme ?? 'light')
      : theme;

  const isDark = resolvedScheme === 'dark';
  const themeColors = isDark ? colors.dark : colors.light;

  const value: ThemeContextValue = React.useMemo(
    () => ({
      theme,
      colorScheme: resolvedScheme,
      colors: themeColors,
      setTheme: (nextTheme) => {
        void persistTheme(nextTheme);
      },
      isDark,
    }),
    [theme, resolvedScheme, themeColors, persistTheme, isDark],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
