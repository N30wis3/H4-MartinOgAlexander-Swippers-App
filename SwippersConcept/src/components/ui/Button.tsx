import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, MIN_TOUCH, Radius, Spacing } from '@/constants/theme';

import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const BACKGROUND: Record<Variant, string> = {
  primary: Colors.primary,
  secondary: Colors.surfaceHigh,
  ghost: 'transparent',
  danger: 'transparent',
};

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, style }: Props) {
  const inactive = disabled || loading;
  const textColor = variant === 'danger' ? Colors.danger : Colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: BACKGROUND[variant] },
        variant === 'danger' && styles.dangerBorder,
        variant === 'ghost' && styles.ghost,
        pressed && (variant === 'primary' ? { backgroundColor: Colors.primaryPressed } : styles.pressed),
        inactive && styles.inactive,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon ? <MaterialCommunityIcons name={icon} size={20} color={textColor} /> : null}
          <AppText variant="heading" color={textColor} style={styles.label}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    minWidth: MIN_TOUCH,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  label: { fontSize: 16 },
  dangerBorder: { borderWidth: 1, borderColor: Colors.danger },
  ghost: { minHeight: MIN_TOUCH },
  pressed: { opacity: 0.7 },
  inactive: { opacity: 0.5 },
});
