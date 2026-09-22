import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextField } from '@/components/ui/TextField';
import { Colors, Spacing } from '@/constants/theme';
import { validateEmail } from '@/domain/validation';
import { useApp } from '@/state/AppContext';

export default function LoginScreen() {
  const { logIn } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    const eError = validateEmail(email);
    const pError = password ? null : 'Enter your password.';
    setEmailError(eError);
    setPasswordError(pError);
    setFormError('');
    if (eError || pError) return;

    setLoading(true);
    try {
      // On success the session changes and the root layout redirects.
      await logIn(email, password);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not log in.');
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <ScreenHeader title="Log in" back />
      <View style={styles.form}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={emailError}
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
          error={passwordError}
          secureToggle
          autoCapitalize="none"
          autoComplete="current-password"
          placeholder="Your password"
          onSubmitEditing={submit}
        />

        {formError ? (
          <AppText variant="caption" color={Colors.danger} accessibilityLiveRegion="polite">
            {formError}
          </AppText>
        ) : null}

        <Button label="Log in" loading={loading} onPress={submit} />
        <Button label="Forgot your password?" variant="ghost" onPress={() => router.push('/forgot-password')} />
      </View>

      <View style={styles.footer}>
        <AppText dim>New here?</AppText>
        <Button label="Create an account" variant="ghost" onPress={() => router.replace('/signup')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.lg, marginTop: Spacing.lg },
  footer: { alignItems: 'center', marginTop: Spacing.xl },
});
