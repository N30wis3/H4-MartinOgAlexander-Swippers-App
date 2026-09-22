import { Pressable, StyleSheet } from 'react-native';

import { Colors, MIN_TOUCH, Radius, Spacing } from '@/constants/theme';

import { AppText } from './AppText';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  // Small, non-interactive chip for displaying values (e.g. on the card).
  compact?: boolean;
}

export function Chip({ label, selected, onPress, compact }: Props) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { selected: !!selected } : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.base,
        compact ? styles.compact : styles.regular,
        selected ? styles.selected : styles.idle,
      ]}>
      <AppText variant="caption" style={styles.text} color={selected ? Colors.onPrimary : Colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: Radius.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  regular: { minHeight: MIN_TOUCH, paddingHorizontal: Spacing.lg },
  compact: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md },
  idle: { backgroundColor: Colors.surface, borderColor: Colors.border },
  selected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  text: { fontWeight: '600' },
});
