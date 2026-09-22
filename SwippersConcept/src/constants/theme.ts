// Design guide (DK.01): dark, high-contrast and energetic. Red is the brand
// colour (same red as the main Swippers app), amber is used sparingly for
// rankings and highlights. Anton is the display face for titles only.

export const Colors = {
  bg: '#0A0A0C',
  surface: '#151519',
  surfaceHigh: '#1F1F25',
  border: '#2A2A32',

  text: '#FFFFFF',
  textDim: '#A8A8B3', // 7.6:1 on bg, passes WCAG AA for body text
  textFaint: '#787884',

  primary: '#EA3A3A',
  primaryPressed: '#C92B2B',
  primarySoft: '#3A1717',
  onPrimary: '#FFFFFF',

  accent: '#FFB020',
  success: '#3DD68C',
  danger: '#FF5A5A',
  overlay: 'rgba(0,0,0,0.72)',
} as const;

export const DisplayFont = 'Anton_400Regular';

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

// Profile avatars use a gradient picked from this list (stable per profile id)
// when no photo is uploaded.
export const AvatarGradients: readonly [string, string][] = [
  ['#EA3A3A', '#5E1010'],
  ['#FF8A2B', '#6B2F00'],
  ['#4758D6', '#161F66'],
  ['#1FA37A', '#08402F'],
  ['#B03AEA', '#3F1266'],
  ['#E8B923', '#5E4600'],
];

export function gradientFor(id: string): readonly [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AvatarGradients[hash % AvatarGradients.length];
}

// Minimum touch target recommended by Apple and Google guidelines.
export const MIN_TOUCH = 44;
