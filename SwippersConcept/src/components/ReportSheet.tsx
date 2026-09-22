import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Sheet } from '@/components/ui/Sheet';
import { Colors, MIN_TOUCH, Radius, Spacing } from '@/constants/theme';

export const REPORT_REASONS = [
  'Inappropriate photo',
  'Offensive or aggressive behaviour',
  'Fake profile',
  'Harassment',
  'Something else',
];

interface Props {
  // Name of the profile being reported; the sheet is hidden when null.
  name: string | null;
  onSelect: (reason: string) => void;
  onClose: () => void;
}

// Users report profiles here (feeds the admin site's moderation queue, AK.03).
export function ReportSheet({ name, onSelect, onClose }: Props) {
  return (
    <Sheet visible={name !== null} onClose={onClose} title={`Report ${name ?? ''}`}>
      <AppText dim>Why are you reporting this profile? Our moderators will review it.</AppText>
      {REPORT_REASONS.map((reason) => (
        <Pressable
          key={reason}
          accessibilityRole="button"
          onPress={() => onSelect(reason)}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
          <AppText>{reason}</AppText>
        </Pressable>
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceHigh,
  },
});
