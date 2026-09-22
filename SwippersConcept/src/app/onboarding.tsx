import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BasicsSection, ClassesSection, LocationSection, SportsSection } from '@/components/ProfileFormSections';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { IconButton } from '@/components/ui/ScreenHeader';
import { useToast } from '@/components/ui/Toast';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { LEVELS } from '@/domain/types';
import {
  EMPTY_DRAFT,
  validateBio,
  validateName,
  validateProfileDraft,
  type DraftErrors,
  type ProfileDraft,
} from '@/domain/validation';
import { useApp } from '@/state/AppContext';

interface RoleChoice {
  fighter: boolean;
  judge: boolean;
}

// Database mode only: pick fighter, judge, or both (FK.01 extension). Local
// mode has no roles concept, so this step never appears there.
function RoleStep({ choice, onChange, error }: { choice: RoleChoice; onChange: (c: RoleChoice) => void; error: string }) {
  return (
    <View style={styles.roleSection}>
      <RoleCard
        icon="boxing-glove"
        title="Fighter"
        description="Swipe to find opponents and get matched for a real fight."
        selected={choice.fighter}
        onPress={() => onChange({ ...choice, fighter: !choice.fighter })}
      />
      <RoleCard
        icon="gavel"
        title="Judge"
        description="Referee fights that two matched fighters request, and record the result."
        selected={choice.judge}
        onPress={() => onChange({ ...choice, judge: !choice.judge })}
      />
      {error ? (
        <AppText variant="caption" color={Colors.danger}>
          {error}
        </AppText>
      ) : null}
      <AppText variant="caption" dim>
        You can pick both now, or add the other one later from Settings.
      </AppText>
    </View>
  );
}

function RoleCard({
  icon,
  title,
  description,
  selected,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.roleCard, selected && styles.roleCardSelected]}>
      <MaterialCommunityIcons name={icon} size={28} color={selected ? Colors.primary : Colors.textDim} />
      <View style={styles.roleText}>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="caption" dim>
          {description}
        </AppText>
      </View>
      <MaterialCommunityIcons
        name={selected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
        size={22}
        color={selected ? Colors.primary : Colors.textFaint}
      />
    </Pressable>
  );
}

type StepKey = 'role' | 'about' | 'sports' | 'class' | 'location';

interface Step {
  key: StepKey;
  title: string;
  subtitle: string;
  render: () => React.ReactNode;
}

export default function OnboardingScreen() {
  const { cloud, saveProfile, chooseRoles, saveIdentity, logOut } = useApp();
  const toast = useToast();
  const [roleChoice, setRoleChoice] = useState<RoleChoice>({ fighter: true, judge: false });
  const [roleError, setRoleError] = useState('');
  const [draft, setDraft] = useState<ProfileDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // In local mode there is no role choice, so every account behaves like a
  // fighter, exactly as before this feature existed.
  const wantFighter = !cloud || roleChoice.fighter;

  function change(patch: Partial<ProfileDraft>) {
    setDraft((d) => ({ ...d, ...patch }));
    // Clear the error of whatever the user just edited.
    setErrors((e) => {
      const next = { ...e };
      for (const key of Object.keys(patch) as (keyof ProfileDraft)[]) delete next[key];
      return next;
    });
  }

  const steps: Step[] = [];
  if (cloud) {
    steps.push({
      key: 'role',
      title: 'How will you use Swippers?',
      subtitle: 'Pick one or both.',
      render: () => <RoleStep choice={roleChoice} onChange={setRoleChoice} error={roleError} />,
    });
  }
  steps.push({
    key: 'about',
    title: 'About you',
    subtitle: 'Add a photo and a few words so people know who they are meeting.',
    render: () => <BasicsSection draft={draft} errors={errors} onChange={change} />,
  });
  if (wantFighter) {
    steps.push(
      {
        key: 'sports',
        title: 'Your martial arts',
        subtitle: 'What do you train?',
        render: () => <SportsSection draft={draft} errors={errors} onChange={change} />,
      },
      {
        key: 'class',
        title: 'Your class',
        subtitle: 'A rough size helps us find fair matches.',
        render: () => <ClassesSection draft={draft} errors={errors} onChange={change} />,
      },
      {
        key: 'location',
        title: 'Where you train',
        subtitle: 'So we can show fighters near you.',
        render: () => <LocationSection draft={draft} errors={errors} onChange={change} />,
      },
    );
  }

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  async function finish() {
    setSaving(true);
    setSaveError('');
    try {
      // The profile/identity row must exist first: user_roles.user_id has a
      // foreign key to the account's `users` row, so a role cannot be
      // registered before it does.
      if (wantFighter) {
        await saveProfile(draft);
      } else {
        // Judge-only: just enough identity to join a fight's chat.
        await saveIdentity(draft.name, draft.bio);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save your profile.');
      setSaving(false);
      return;
    }

    // The profile is saved by this point, so a fighter-only account is
    // already "done" and the root guard may navigate away right here. Role
    // registration failures are shown as a toast (which survives that
    // transition) rather than this screen's own error text.
    if (cloud) {
      const chosen: ('fighter' | 'judge')[] = [];
      if (roleChoice.fighter) chosen.push('fighter');
      if (roleChoice.judge) chosen.push('judge');
      if (chosen.length > 0) {
        try {
          await chooseRoles(chosen);
        } catch (err) {
          toast(
            err instanceof Error ? err.message : "Profile saved, but couldn't save your role choice. Add it from Settings.",
            'error',
          );
        }
      }
    }
    setSaving(false);
  }

  async function next() {
    if (step.key === 'role') {
      if (!roleChoice.fighter && !roleChoice.judge) {
        setRoleError('Pick at least one.');
        return;
      }
      setRoleError('');
      setStepIndex((i) => i + 1);
      return;
    }

    if (step.key === 'about') {
      const stepErrors: DraftErrors = {};
      const nameError = validateName(draft.name);
      if (nameError) stepErrors.name = nameError;
      const bioError = validateBio(draft.bio);
      if (bioError) stepErrors.bio = bioError;
      // Experience level only matters for a swipeable fighter profile.
      if (wantFighter && (!draft.level || !LEVELS.includes(draft.level))) {
        stepErrors.level = 'Pick your experience level.';
      }
      setErrors(stepErrors);
      if (Object.keys(stepErrors).length > 0) return;
    } else {
      const fieldsByStep: Record<string, (keyof ProfileDraft)[]> = {
        sports: ['sports'],
        class: cloud
          ? ['genderId', 'seekingGenderId', 'ageGroupId', 'heightClassId', 'weightClassId']
          : ['ageGroupId', 'heightClassId', 'weightClassId'],
        location: ['location'],
      };
      const all = validateProfileDraft(draft, { requireGender: cloud });
      const stepErrors: DraftErrors = {};
      for (const field of fieldsByStep[step.key] ?? []) if (all[field]) stepErrors[field] = all[field];
      setErrors(stepErrors);
      if (Object.keys(stepErrors).length > 0) return;
    }

    if (isLast) {
      // Saving flips the root guard, which opens the app.
      await finish();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  return (
    <Screen scroll>
      <View style={styles.top}>
        {stepIndex > 0 ? (
          <IconButton icon="arrow-left" label="Previous step" onPress={() => setStepIndex((i) => i - 1)} />
        ) : (
          <View style={styles.spacer} />
        )}
        <View style={styles.progress} accessibilityLabel={`Step ${stepIndex + 1} of ${steps.length}`}>
          {steps.map((s, i) => (
            <View key={s.key} style={[styles.bar, i <= stepIndex && styles.barActive]} />
          ))}
        </View>
        <Button label="Log out" variant="ghost" onPress={logOut} />
      </View>

      <AppText variant="title" style={styles.title}>
        {step.title}
      </AppText>
      <AppText dim style={styles.subtitle}>
        {step.subtitle}
      </AppText>

      {step.render()}

      <View style={styles.footer}>
        {saveError ? (
          <AppText variant="caption" color={Colors.danger} accessibilityLiveRegion="polite">
            {saveError}
          </AppText>
        ) : null}
        <Button label={isLast ? 'Finish' : 'Continue'} loading={saving} onPress={next} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, minHeight: 56 },
  spacer: { width: 44 },
  progress: { flex: 1, flexDirection: 'row', gap: Spacing.xs },
  bar: { flex: 1, height: 5, borderRadius: Radius.pill, backgroundColor: Colors.border },
  barActive: { backgroundColor: Colors.primary },
  title: { marginTop: Spacing.lg },
  subtitle: { marginTop: Spacing.xs, marginBottom: Spacing.xl },
  footer: { marginTop: Spacing.xxl, gap: Spacing.md },
  roleSection: { gap: Spacing.md },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  roleCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  roleText: { flex: 1, gap: 2 },
});
