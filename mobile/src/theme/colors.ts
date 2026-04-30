// ============================================
// PromptVault Mobile - Color Tokens
// Ported from web styles.css CSS variables
// ============================================

export const colors = {
  light: {
    bgPrimary: '#ffffff',
    bgSecondary: '#f8fafc',
    bgTertiary: '#f1f5f9',
    bgElevated: '#ffffff',
    bgHover: '#f1f5f9',
    bgActive: '#e2e8f0',

    border: '#e2e8f0',
    borderSubtle: '#f1f5f9',

    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textTertiary: '#94a3b8',
    textMuted: '#cbd5e1',

    accent: '#3b82f6',
    accentHover: '#2563eb',
    accentBg: '#eff6ff',
    accentBorder: '#bfdbfe',

    success: '#10b981',
    successBg: '#ecfdf5',
    error: '#ef4444',
    errorBg: '#fef2f2',
    warning: '#f59e0b',
    warningBg: '#fffbeb',

    glassBg: 'rgba(255, 255, 255, 0.8)',
    glassBorder: 'rgba(255, 255, 255, 0.2)',
  },

  dark: {
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgTertiary: '#334155',
    bgElevated: '#1e293b',
    bgHover: '#334155',
    bgActive: '#475569',

    border: '#334155',
    borderSubtle: '#1e293b',

    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textTertiary: '#94a3b8',
    textMuted: '#64748b',

    accent: '#60a5fa',
    accentHover: '#3b82f6',
    accentBg: 'rgba(59, 130, 246, 0.15)',
    accentBorder: 'rgba(59, 130, 246, 0.3)',

    success: '#10b981',
    successBg: 'rgba(16, 185, 129, 0.15)',
    error: '#ef4444',
    errorBg: 'rgba(239, 68, 68, 0.15)',
    warning: '#f59e0b',
    warningBg: 'rgba(245, 158, 11, 0.15)',

    glassBg: 'rgba(30, 41, 59, 0.8)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
  },
} as const;

export type ColorScheme = {
  [K in keyof typeof colors.light]: string;
};
