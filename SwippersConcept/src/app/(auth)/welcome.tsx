import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing } from '@/constants/theme';
import { useApp } from '@/state/AppContext';

const PERKS = [
  { icon: 'map-marker-radius', text: 'Find sparring partners near you' },
  { icon: 'scale-balance', text: 'Fair matches by weight, height and age' },
  { icon: 'message-text', text: 'Chat and set up your next session' },
] as const;

export default function WelcomeScreen() {
  const { cloud, cloudError, startDemo } = useApp();
  const [loading, setLoading] = useState(false);

  async function tryDemo() {
    setLoading(true);
    await startDemo();
  }

  return (
    <LinearGradient colors={['#5E1010', Colors.bg, Colors.bg]} locations={[0, 0.55, 1]} style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.content}>
          <View style={styles.hero}>
            <View style={styles.logo}>
              <MaterialCommunityIcons name="boxing-glove" size={40} color={Colors.onPrimary} />
            </View>
            <AppText variant="display" style={styles.brand}>
              Swippers
            </AppText>
            <AppText variant="heading" dim>
              Find your sparring partner.
            </AppText>
          </View>

          <View style={styles.perks}>
            {PERKS.map((perk) => (
              <View key={perk.text} style={styles.perk}>
                <MaterialCommunityIcons name={perk.icon} size={24} color={Colors.primary} />
                <AppText>{perk.text}</AppText>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <Button label="Create account" onPress={() => router.push('/signup')} />
            <Button label="Log in" variant="secondary" onPress={() => router.push('/login')} />
            {cloud ? null : <Button label="Try the demo account" variant="ghost" loading={loading} onPress={tryDemo} />}
            {cloudError ? (
              <AppText variant="caption" color={Colors.danger} style={styles.error}>
                {cloudError}
              </AppText>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flex: 1, justifyContent: 'space-between', padding: Spacing.xl, paddingTop: Spacing.xxl * 2 },
  hero: { alignItems: 'center', gap: Spacing.sm },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    transform: [{ rotate: '-8deg' }],
  },
  brand: { fontSize: 56, lineHeight: 62 },
  perks: { gap: Spacing.lg },
  perk: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  actions: { gap: Spacing.sm },
  error: { textAlign: 'center' },
});
