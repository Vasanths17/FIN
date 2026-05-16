export const theme = {
  colors: {
    background: '#0B1426',
    surface: '#111D35',
    card: '#162040',
    cardGlass: 'rgba(22, 32, 64, 0.7)',
    primary: '#00D4AA',
    primaryDark: '#00A888',
    accent: '#6C63FF',
    danger: '#FF4757',
    warning: '#FFA502',
    safe: '#00D4AA',
    text: '#FFFFFF',
    textSecondary: '#8892B0',
    textMuted: '#5A6380',
    border: 'rgba(255,255,255,0.08)',
    gradientStart: '#0B1426',
    gradientEnd: '#1A1040',
    glassBackground: 'rgba(255,255,255,0.05)',
    glassBorder: 'rgba(255,255,255,0.1)',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 24, full: 999 },
  fontSize: { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, xxl: 32, hero: 48 },
};

export type Theme = typeof theme;
