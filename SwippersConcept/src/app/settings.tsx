import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ConfirmDialog } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useApp } from '@/state/AppContext';

export default function SettingsScreen() {
  const { account, profile, cloud, isFighter, isJudge, chooseRoles, logOut, deleteAccount } = useApp();
  const toast = useToast();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [addingJudge, setAddingJudge] = useState(false);

  async function becomeJudge() {
    setAddingJudge(true);
    try {
      await chooseRoles(['judge']);
      toast("You're now a judge. Open the judge dashboard to see open fights.", 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add the judge role.', 'error');
    } finally {
      setAddingJudge(false);
    }
  }

  return (
    <Screen scroll>
      <ScreenHeader title="Settings" back />

      <View style={styles.section}>
        <AppText variant="label" dim>
          Account
        </AppText>
        <View style={styles.card}>
          <AppText variant="caption" dim>
            Signed in as
          </AppText>
          <AppText variant="heading">{account?.email}</AppText>
        </View>
      </View>

      {cloud ? (
        <View style={styles.section}>
          <AppText variant="label" dim>
            Roles
          </AppText>
          <View style={styles.chips}>
            {isFighter ? <Chip label="Fighter" selected compact /> : null}
            {isJudge ? <Chip label="Judge" selected compact /> : null}
            {!isFighter && !isJudge ? <Chip label="None yet" compact /> : null}
          </View>
          {isJudge ? (
            <Button label="Open judge dashboard" icon="gavel" variant="secondary" onPress={() => router.push('/judge')} />
          ) : (
            <Button label="Also become a judge" icon="gavel" variant="secondary" loading={addingJudge} onPress={becomeJudge} />
          )}
          {!isFighter ? (
            <AppText variant="caption" dim>
              Adding fighter capability to a judge-only account isn't available yet — sign up again with a new account to
              also be a fighter.
            </AppText>
          ) : null}
        </View>
      ) : null}

      {profile ? (
        <View style={styles.section}>
          <AppText variant="label" dim>
            Discovery
          </AppText>
          <Button label="Edit filters" icon="tune-variant" variant="secondary" onPress={() => router.push('/filters')} />
          <Button label="Edit profile" icon="pencil" variant="secondary" onPress={() => router.push('/edit-profile')} />
        </View>
      ) : null}

      <View style={styles.section}>
        <Button label="Log out" icon="logout" variant="secondary" onPress={logOut} />
      </View>

      <View style={[styles.section, styles.danger]}>
        <AppText variant="label" color={Colors.danger}>
          Danger zone
        </AppText>
        <AppText variant="caption" dim>
          Deleting your account permanently removes your profile, matches, messages and stats. This cannot be undone.
        </AppText>
        <Button label="Delete my account" icon="delete-outline" variant="danger" onPress={() => setConfirmingDelete(true)} />
      </View>

      <ConfirmDialog
        visible={confirmingDelete}
        title="Delete account?"
        message="All of your personal data will be erased from this device and cannot be recovered."
        confirmLabel="Delete everything"
        destructive
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          try {
            // Removing the account flips the root guard back to the login flow.
            deleteAccount();
          } catch (err) {
            toast(err instanceof Error ? err.message : 'Could not delete the account.', 'error');
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm, marginTop: Spacing.xl },
  card: { padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: Colors.surface, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  danger: { marginTop: Spacing.xxl, padding: Spacing.lg, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primarySoft },
});
