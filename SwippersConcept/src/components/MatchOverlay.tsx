import { LinearGradient } from 'expo-linear-gradient';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing } from '@/constants/theme';
import type { Profile } from '@/domain/types';

import { Avatar } from './Avatar';

interface Props {
  visible: boolean;
  me: Profile;
  partner: Profile | null;
  onMessage: () => void;
  onKeepSwiping: () => void;
}

// Full-screen "it's a match" moment (FK.02). This is the in-app notification
// for a new match; the match also appears with a badge in the Matches tab.
export function MatchOverlay({ visible, me, partner, onMessage, onKeepSwiping }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onKeepSwiping}>
      <LinearGradient colors={['#5E1010', '#0A0A0C']} style={styles.fill}>
        {partner ? (
          <View style={styles.content} accessibilityViewIsModal>
            <Animated.View entering={ZoomIn.springify().delay(80)}>
              <AppText variant="display" color={Colors.accent} style={styles.headline}>
                {"It's a match!"}
              </AppText>
            </Animated.View>
            <AppText dim style={styles.sub}>
              You and {partner.name} both want to spar.
            </AppText>

            <Animated.View entering={FadeIn.delay(200)} style={styles.avatars}>
              <View style={styles.ring}>
                <Avatar id={me.id} name={me.name} photoUri={me.photoUri} size={124} />
              </View>
              <View style={[styles.ring, styles.overlap]}>
                <Avatar id={partner.id} name={partner.name} photoUri={partner.photoUri} size={124} />
              </View>
            </Animated.View>

            <View style={styles.actions}>
              <Button label="Send a message" icon="message-text" onPress={onMessage} />
              <Button label="Keep swiping" variant="ghost" onPress={onKeepSwiping} />
            </View>
          </View>
        ) : null}
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  content: { width: '100%', maxWidth: 420, alignItems: 'center', gap: Spacing.md },
  headline: { textAlign: 'center' },
  sub: { textAlign: 'center' },
  avatars: { flexDirection: 'row', marginVertical: Spacing.xl },
  ring: { padding: 4, borderRadius: 999, backgroundColor: Colors.primary },
  overlap: { marginLeft: -28 },
  actions: { width: '100%', gap: Spacing.sm, marginTop: Spacing.lg },
});
