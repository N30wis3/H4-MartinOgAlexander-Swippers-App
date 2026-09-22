import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextField } from '@/components/ui/TextField';
import { Colors, Spacing } from '@/constants/theme';
import { validateEmail, validatePassword } from '@/domain/validation';
import { useApp } from '@/state/AppContext';

export default function SignupScreen() {
  const { signUp } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    const next = {
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
      confirm: confirm === password ? undefined : 'Passwords do not match.',
    };
    setErrors(next);
    setFormError('');
    if (next.email || next.password || next.confirm) return;

    setLoading(true);
    try {
      // On success the session changes and the root layout sends the new user
      // to onboarding.
      await signUp(email, password);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create the account.');
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <ScreenHeader title="Join Swippers" back />
      <AppText dim style={styles.intro}>
        Two quick steps: create your account, then tell us how you train.
      </AppText>

      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          placeholder="you@example.com"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          hint="At least 8 characters, with letters and numbers."
          secureToggle
          autoCapitalize="none"
          autoComplete="new-password"
        />
        <TextField
          label="Repeat password"
          value={confirm}
          onChangeText={setConfirm}
          error={errors.confirm}
          secureToggle
          autoCapitalize="none"
          autoComplete="new-password"
          onSubmitEditing={submit}
        />

        {formError ? (
          <AppText variant="caption" color={Colors.danger} accessibilityLiveRegion="polite">
            {formError}
          </AppText>
        ) : null}

        <Button label="Create account" loading={loading} onPress={submit} />
        <AppText variant="caption" dim style={styles.legal}>
          We store your profile details (age group, height, weight and location) only to find you fair sparring
          partners. You can delete your account and all data at any time in Settings.
        </AppText>
      </View>

      <View style={styles.footer}>
        <AppText dim>Already have an account?</AppText>
        <Button label="Log in" variant="ghost" onPress={() => router.replace('/login')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: Spacing.sm },
  form: { gap: Spacing.lg, marginTop: Spacing.xl },
  legal: { textAlign: 'center' },
  footer: { alignItems: 'center', marginTop: Spacing.xl },
});
