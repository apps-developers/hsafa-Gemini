// Theme color schemes
export const themeColors = {
  dark: {
    primaryColor: '#4D78FF',
    backgroundColor: '#0B0B0F',
    borderColor: '#2A2C33',
    textColor: '#EDEEF0',
    accentColor: '#17181C',
    mutedTextColor: '#9AA0A6',
    inputBackground: '#17181C',
    cardBackground: '#121318',
    hoverBackground: '#1c1e25',
    errorColor: '#ef4444',
    errorColorLight: '#fee2e2',
    errorColorDark: '#991b1b',
    successColor: '#10b981',
    successColorLight: 'rgba(16,185,129,0.15)',
    warningColor: '#eab308',
    warningColorLight: 'rgba(234,179,8,0.15)',
    infoColor: '#3b82f6',
    infoColorLight: 'rgba(59,130,246,0.15)',
    dangerColor: '#ef4444',
    dangerColorLight: 'rgba(239, 68, 68, 0.1)',
    dangerColorDark: '#991b1b',
  },
  light: {
    primaryColor: '#2563EB',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    textColor: '#111827',
    accentColor: '#F9FAFB',
    mutedTextColor: '#6B7280',
    inputBackground: '#F9FAFB',
    cardBackground: '#F3F4F6',
    hoverBackground: '#F3F4F6',
    errorColor: '#ef4444',
    errorColorLight: '#fef2f2',
    errorColorDark: '#991b1b',
    successColor: '#10b981',
    successColorLight: '#d1fae5',
    warningColor: '#eab308',
    warningColorLight: '#fef3c7',
    infoColor: '#3b82f6',
    infoColorLight: '#dbeafe',
    dangerColor: '#ef4444',
    dangerColorLight: 'rgba(239, 68, 68, 0.1)',
    dangerColorDark: '#991b1b',
  }
};

export type ThemeColors = typeof themeColors.dark;

export interface ThemeProps {
  theme?: 'light' | 'dark';
  primaryColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  accentColor?: string;
}

export function resolveThemeColors(
  theme: 'light' | 'dark',
  overrides: Omit<ThemeProps, 'theme'> = {}
): ThemeColors {
  const themeColorScheme = themeColors[theme];
  return {
    primaryColor: overrides.primaryColor || themeColorScheme.primaryColor,
    backgroundColor: overrides.backgroundColor || themeColorScheme.backgroundColor,
    borderColor: overrides.borderColor || themeColorScheme.borderColor,
    textColor: overrides.textColor || themeColorScheme.textColor,
    accentColor: overrides.accentColor || themeColorScheme.accentColor,
    mutedTextColor: themeColorScheme.mutedTextColor,
    inputBackground: themeColorScheme.inputBackground,
    cardBackground: themeColorScheme.cardBackground,
    hoverBackground: themeColorScheme.hoverBackground,
    errorColor: themeColorScheme.errorColor,
    errorColorLight: themeColorScheme.errorColorLight,
    errorColorDark: themeColorScheme.errorColorDark,
    successColor: themeColorScheme.successColor,
    successColorLight: themeColorScheme.successColorLight,
    warningColor: themeColorScheme.warningColor,
    warningColorLight: themeColorScheme.warningColorLight,
    infoColor: themeColorScheme.infoColor,
    infoColorLight: themeColorScheme.infoColorLight,
    dangerColor: themeColorScheme.dangerColor,
    dangerColorLight: themeColorScheme.dangerColorLight,
    dangerColorDark: themeColorScheme.dangerColorDark,
  };
}

export function createContainerStyles(
  resolvedColors: ThemeColors,
  height: string,
  dir: string
) {
  return {
    backgroundColor: resolvedColors.backgroundColor,
    color: resolvedColors.textColor,
    height,
    display: 'flex',
    width: '100%',
    fontFamily: 'Rubik, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
  };
}

export function createChatPanelStyles(width: number | string, maxWidth: number | string) {
  return {
    width: typeof width === 'number' ? `${width}px` : width,
    maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
    display: 'flex',
    flexDirection: 'column' as const,
    transition: 'all 0.3s ease-out',
    overflow: 'hidden'
  };
}

export function createFloatingButtonStyles(
  floatingButtonPosition: {
    bottom?: number | string;
    top?: number | string;
    left?: number | string;
    right?: number | string;
  }
) {
  return {
    position: 'fixed' as const,
    bottom: typeof floatingButtonPosition.bottom === 'number' ? `${floatingButtonPosition.bottom}px` : floatingButtonPosition.bottom,
    right: floatingButtonPosition.right ? (typeof floatingButtonPosition.right === 'number' ? `${floatingButtonPosition.right}px` : floatingButtonPosition.right) : undefined,
    top: floatingButtonPosition.top ? (typeof floatingButtonPosition.top === 'number' ? `${floatingButtonPosition.top}px` : floatingButtonPosition.top) : undefined,
    left: floatingButtonPosition.left ? (typeof floatingButtonPosition.left === 'number' ? `${floatingButtonPosition.left}px` : floatingButtonPosition.left) : undefined,
    zIndex: 1000
  };
}
