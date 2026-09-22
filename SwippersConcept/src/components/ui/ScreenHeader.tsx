import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, MIN_TOUCH, Spacing } from '@/constants/theme';

import { AppText } from './AppText';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface Props {
  title: string;
  // Shows a back arrow that pops the current screen.
  back?: boolean;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, back, right }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {back ? (
          <IconButton icon="arrow-left" label="Go back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        ) : null}
      </View>
      <AppText variant="title" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );
}

interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  badge?: number;
}

export function IconButton({ icon, label, onPress, color = Colors.text, badge }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}>
      <MaterialCommunityIcons name={icon} size={26} color={color} />
      {badge ? (
        <View style={styles.badge}>
          <AppText variant="caption" style={styles.badgeText}>
            {badge}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: Spacing.xs },
  side: { width: MIN_TOUCH + Spacing.sm, alignItems: 'flex-start' },
  sideRight: { alignItems: 'flex-end' },
  title: { flex: 1, textAlign: 'center' },
  iconButton: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
});
