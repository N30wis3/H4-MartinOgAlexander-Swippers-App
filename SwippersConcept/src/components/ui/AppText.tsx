import { Text, type TextProps, type TextStyle } from 'react-native';

import { Colors, DisplayFont } from '@/constants/theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';

const VARIANTS: Record<Variant, TextStyle> = {
  // Anton is a condensed poster face; use it for hero/section titles only.
  display: { fontFamily: DisplayFont, fontSize: 44, lineHeight: 50, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontFamily: DisplayFont, fontSize: 28, lineHeight: 34, letterSpacing: 0.5, textTransform: 'uppercase' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  caption: { fontSize: 13, lineHeight: 18 },
};

interface Props extends TextProps {
  variant?: Variant;
  dim?: boolean;
  color?: string;
}

export function AppText({ variant = 'body', dim, color, style, ...rest }: Props) {
  return (
    <Text
      // Headings are announced as headings by screen readers (DK.04).
      accessibilityRole={variant === 'display' || variant === 'title' ? 'header' : undefined}
      style={[{ color: color ?? (dim ? Colors.textDim : Colors.text) }, VARIANTS[variant], style]}
      {...rest}
    />
  );
}
