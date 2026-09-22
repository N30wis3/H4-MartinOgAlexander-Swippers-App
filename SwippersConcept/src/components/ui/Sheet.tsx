// Modal building blocks that behave the same on iOS, Android and web. (The
// built-in Alert.alert does not show buttons on web, so we use our own.)

import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

import { AppText } from './AppText';
import { Button } from './Button';

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

// Bottom sheet.
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismiss} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <AppText variant="title">{title}</AppText>
          <View style={styles.body}>{children}</View>
        </View>
      </View>
    </Modal>
  );
}

interface ConfirmProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Centered confirmation dialog.
export function ConfirmDialog({ visible, title, message, confirmLabel, destructive, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.backdrop, styles.centered]}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <AppText variant="title">{title}</AppText>
          <AppText dim style={styles.message}>
            {message}
          </AppText>
          <Button label={confirmLabel} variant={destructive ? 'danger' : 'primary'} onPress={onConfirm} />
          <Button label="Cancel" variant="ghost" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  centered: { justifyContent: 'center', padding: Spacing.xl },
  dismiss: { flex: 1 },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  body: { gap: Spacing.md },
  dialog: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    gap: Spacing.sm,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  message: { marginBottom: Spacing.md },
});
