export const uiTokens = {
  color: {
    textPrimary: '#ffffff',
    textMuted: '#94a3b8',
    iconPrimary: '#f8fafc',
    borderSoft: 'rgba(255, 255, 255, 0.1)',
    surfaceSoft: 'rgba(255, 255, 255, 0.05)',
    surfaceStrong: 'rgba(30, 41, 59, 0.7)',
    navActive: '#c084fc',
    navInactive: '#64748b',
  },
  gradient: {
    brand: ['#7c3aed', '#db2777'] as const,
    avatar: ['#a855f7', '#ec4899'] as const,
  },
  radius: {
    md: 12,
    xl: 16,
    pill: 999,
  },
  size: {
    controlHeight: 48,
    iconButton: 44,
    avatar: 48,
  },
} as const;
