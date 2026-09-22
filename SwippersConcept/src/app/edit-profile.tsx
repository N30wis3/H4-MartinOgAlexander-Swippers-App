import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BasicsSection, ClassesSection, LocationSection, SportsSection } from '@/components/ProfileFormSections';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useToast } from '@/components/ui/Toast';
import { Colors, Spacing } from '@/constants/theme';
import {
  EMPTY_DRAFT,
  profileToDraft,
  validateProfileDraft,
  type DraftErrors,
  type ProfileDraft,
} from '@/domain/validation';
import { useApp } from '@/state/AppContext';

export default function EditProfileScreen() {
  const { cloud, profile, saveProfile } = useApp();
  const toast = useToast();
  const [draft, setDraft] = useState<ProfileDraft>(profile ? profileToDraft(profile) : EMPTY_DRAFT);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  function change(patch: Partial<ProfileDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const key of Object.keys(patch) as (keyof ProfileDraft)[]) delete next[key];
      return next;
    });
  }

  async function save() {
    const found = validateProfileDraft(draft, { requireGender: cloud });
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    setSaveError('');
    try {
      await saveProfile(draft);
      toast('Profile updated.', 'success');
      router.back();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save your profile.');
      setSaving(false);
    }
  }

  const section = { draft, errors, onChange: change };

  return (
    <Screen scroll>
      <ScreenHeader title="Edit profile" back />

      <View style={styles.sections}>
        <BasicsSection {...section} />
        <Heading>Martial arts</Heading>
        <SportsSection {...section} />
        <Heading>Your class</Heading>
        <ClassesSection {...section} />
        <Heading>Where you train</Heading>
        <LocationSection {...section} />
      </View>

      <View style={styles.footer}>
        {saveError ? (
          <AppText variant="caption" color={Colors.danger} accessibilityLiveRegion="polite">
            {saveError}
          </AppText>
        ) : null}
        <Button label="Save changes" loading={saving} onPress={save} />
      </View>
    </Screen>
  );
}

function Heading({ children }: { children: string }) {
  return (
    <View style={styles.heading}>
      <AppText variant="title">{children}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  sections: { gap: Spacing.xl, marginTop: Spacing.lg },
  heading: { marginTop: Spacing.lg, paddingTop: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.border },
  footer: { marginTop: Spacing.xxl, gap: Spacing.md },
});
