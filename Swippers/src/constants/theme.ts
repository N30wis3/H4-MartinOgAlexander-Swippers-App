/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#EEEDED',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    primary: '#EA3A3A',
    secondary: '#4758D6',
    error: '#EA3A3A',
    success: '#75B363',
    warning: '#E1811F',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#222222',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    primary: '#EA3A3A',
    secondary: '#4758D6',
    error: '#EA3A3A',
    success: '#75B363',
    warning: '#E1811F',
  },
} as const;

// Bold condensed display face for titles/headlines — loaded via
// @expo-google-fonts/anton in the root layout. Use only for hero/title
// text, never body copy or labels (that's what makes it feel intentional
// rather than default-bold-everywhere).
export const DisplayFont = 'Anton_400Regular';

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
