import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, Spacing } from '@/constants/theme';
import { validateEmail, validatePassword } from '@/domain/validation';
import { DEMO_RESET_CODE, useApp } from '@/state/AppContext';

// Two steps: ask for the email, then enter the code and a new password. The
// concept has no email service, so the code is fixed and shown on screen.
export default function ForgotPasswordScreen() {
  const { cloud, requestPasswordReset, resetPassword } = useApp();
  const toast = useToast();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [sent, setSent] = useState(false);

  async function sendCode() {
    const problem = validateEmail(email);
    setError(problem);
    if (problem) return;

    if (cloud) {
      // The database sends a real reset email; the answer is the same for
      // unknown addresses so the form cannot reveal which have accounts.
      setLoading(true);
      try {
        await requestPasswordReset(email);
        setSent(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not send the reset email.');
      }
      setLoading(false);
      return;
    }
    // Local demo: always move on, even for unknown emails.
    setStep('reset');
  }

  async function submitReset() {
    const problem = validatePassword(password);
    if (problem) return setError(problem);

    setLoading(true);
    setError(null);
    try {
      await resetPassword(email, code, password);
      toast('Password updated. Log in with your new password.', 'success');
      router.replace('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset the password.');
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <ScreenHeader title="Reset password" back />

      {cloud && sent ? (
        <View style={styles.form}>
          <AppText dim>If an account exists for {email.trim()}, we sent a link to reset the password. Check your inbox.</AppText>
          <Button label="Back to log in" onPress={() => router.replace('/login')} />
        </View>
      ) : step === 'email' ? (
        <View style={styles.form}>
          <AppText dim>{cloud ? 'Enter your email and we will send you a reset link.' : 'Enter your email and we will send you a reset code.'}</AppText>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={error}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            placeholder="you@example.com"
            onSubmitEditing={sendCode}
          />
          <Button label={cloud ? 'Send reset link' : 'Send reset code'} loading={loading} onPress={sendCode} />
        </View>
      ) : (
        <View style={styles.form}>
          <AppText dim>If an account exists for {email.trim()}, we sent a 6-digit code to it.</AppText>
          <View style={styles.demoNote}>
            <AppText variant="caption">Demo: no email is sent. Use code {DEMO_RESET_CODE}.</AppText>
          </View>
          <TextField
            label="Reset code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
          />
          <TextField
            label="New password"
            value={password}
            onChangeText={setPassword}
            error={error}
            hint="At least 8 characters, with letters and numbers."
            secureToggle
            autoCapitalize="none"
            autoComplete="new-password"
            onSubmitEditing={submitReset}
          />
          <Button label="Set new password" loading={loading} onPress={submitReset} />
          <Button label="Use a different email" variant="ghost" onPress={() => setStep('email')} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.lg, marginTop: Spacing.lg },
  demoNote: {
    padding: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
