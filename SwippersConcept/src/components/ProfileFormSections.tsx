// Form sections shared by onboarding (one step at a time) and Edit Profile
// (all at once). Each section edits part of a ProfileDraft and shows the
// validation errors it is given.

import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { pickPhoto, type PhotoSource } from '@/data/photos';
import { AGE_GROUPS, HEIGHT_CLASSES, WEIGHT_CLASSES } from '@/domain/classes';
import { CITIES, nearestCity } from '@/domain/geo';
import { LEVELS, SPORTS, type Sport } from '@/domain/types';
import { BIO_MAX, MAX_SPORTS, NAME_MAX, type DraftErrors, type ProfileDraft } from '@/domain/validation';
import { useApp } from '@/state/AppContext';

interface SectionProps {
  draft: ProfileDraft;
  errors: DraftErrors;
  onChange: (patch: Partial<ProfileDraft>) => void;
}

// Small "why we ask" explanation (DK.05).
function Why({ children }: { children: string }) {
  return (
    <View style={styles.why}>
      <MaterialCommunityIcons name="information-outline" size={18} color={Colors.accent} />
      <AppText variant="caption" dim style={styles.whyText}>
        {children}
      </AppText>
    </View>
  );
}

function Group({ title, error, children }: { title: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <AppText variant="label" dim>
        {title}
      </AppText>
      {children}
      {error ? (
        <AppText variant="caption" color={Colors.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------------ basics

export function BasicsSection({ draft, errors, onChange }: SectionProps) {
  const [photoError, setPhotoError] = useState('');
  const [busy, setBusy] = useState(false);

  async function choose(source: PhotoSource) {
    setBusy(true);
    setPhotoError('');
    try {
      const uri = await pickPhoto(source);
      if (uri) onChange({ photoUri: uri });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Could not load the photo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.section}>
      <View style={styles.photoRow}>
        <Avatar id="draft" name={draft.name || 'You'} photoUri={draft.photoUri} size={104} />
        <View style={styles.photoButtons}>
          <Button label={draft.photoUri ? 'Change photo' : 'Add photo'} icon="image-plus" variant="secondary" loading={busy} onPress={() => choose('library')} />
          {Platform.OS !== 'web' ? (
            <Button label="Take photo" icon="camera" variant="ghost" onPress={() => choose('camera')} />
          ) : null}
          {draft.photoUri ? <Button label="Remove" variant="ghost" onPress={() => onChange({ photoUri: null })} /> : null}
        </View>
      </View>
      {photoError ? (
        <AppText variant="caption" color={Colors.danger}>
          {photoError}
        </AppText>
      ) : null}

      <TextField
        label="Name"
        value={draft.name}
        onChangeText={(name) => onChange({ name })}
        error={errors.name}
        maxLength={NAME_MAX + 10}
        autoCapitalize="words"
        autoComplete="name"
        placeholder="What should partners call you?"
      />

      <Group title="Experience level" error={errors.level}>
        <View style={styles.chips}>
          {LEVELS.map((level) => (
            <Chip key={level} label={level} selected={draft.level === level} onPress={() => onChange({ level })} />
          ))}
        </View>
      </Group>

      <TextField
        label="About you"
        value={draft.bio}
        onChangeText={(bio) => onChange({ bio })}
        error={errors.bio}
        hint={`${draft.bio.length}/${BIO_MAX} · Your experience and what you want from sparring.`}
        multiline
        placeholder="e.g. Boxing for 3 years, love technical rounds."
      />
    </View>
  );
}

// ------------------------------------------------------------------ sports

export function SportsSection({ draft, errors, onChange }: SectionProps) {
  function toggle(sport: Sport) {
    const has = draft.sports.includes(sport);
    if (!has && draft.sports.length >= MAX_SPORTS) return;
    onChange({ sports: has ? draft.sports.filter((s) => s !== sport) : [...draft.sports, sport] });
  }

  return (
    <View style={styles.section}>
      <Group title={`Your martial arts (pick up to ${MAX_SPORTS})`} error={errors.sports}>
        <View style={styles.chips}>
          {SPORTS.map((sport) => (
            <Chip key={sport} label={sport} selected={draft.sports.includes(sport)} onPress={() => toggle(sport)} />
          ))}
        </View>
      </Group>
      <Why>{"We match you with people who train the same martial arts, so you'll always have something in common."}</Why>
    </View>
  );
}

// ----------------------------------------------------------------- classes

function ClassPicker({
  title,
  options,
  value,
  error,
  onChange,
}: {
  title: string;
  options: { id: string; label: string }[];
  value: string | null;
  error?: string;
  onChange: (id: string) => void;
}) {
  return (
    <Group title={title} error={error}>
      <View style={styles.chips}>
        {options.map((option) => (
          <Chip key={option.id} label={option.label} selected={value === option.id} onPress={() => onChange(option.id)} />
        ))}
      </View>
    </Group>
  );
}

export function ClassesSection({ draft, errors, onChange }: SectionProps) {
  const { cloud, genders } = useApp();

  return (
    <View style={styles.section}>
      {/* The database needs these to include you in other people's results. */}
      {cloud ? (
        <>
          <ClassPicker
            title="I am"
            options={genders}
            value={draft.genderId}
            error={errors.genderId}
            onChange={(genderId) => onChange({ genderId })}
          />
          <ClassPicker
            title="Looking for"
            options={genders}
            value={draft.seekingGenderId}
            error={errors.seekingGenderId}
            onChange={(seekingGenderId) => onChange({ seekingGenderId })}
          />
        </>
      ) : null}
      <ClassPicker
        title="Age group"
        options={AGE_GROUPS}
        value={draft.ageGroupId}
        error={errors.ageGroupId}
        onChange={(ageGroupId) => onChange({ ageGroupId })}
      />
      <ClassPicker
        title="Height"
        options={HEIGHT_CLASSES}
        value={draft.heightClassId}
        error={errors.heightClassId}
        onChange={(heightClassId) => onChange({ heightClassId })}
      />
      <ClassPicker
        title="Weight"
        options={WEIGHT_CLASSES}
        value={draft.weightClassId}
        error={errors.weightClassId}
        onChange={(weightClassId) => onChange({ weightClassId })}
      />
      <Why>
        Size and age make a big difference in sparring. We only ask for a rough class, never exact numbers, so we
        can suggest fair, safe matches.
      </Why>
    </View>
  );
}

// ---------------------------------------------------------------- location

export function LocationSection({ draft, errors, onChange }: SectionProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function useMyLocation() {
    setStatus('loading');
    setMessage('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Location access was denied. Pick your city below instead.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { lat: position.coords.latitude, lon: position.coords.longitude };
      onChange({ location: { city: nearestCity(point).city, ...point } });
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Could not get your location. Pick your city below.');
    }
  }

  return (
    <View style={styles.section}>
      <Button
        label="Use my current location"
        icon="crosshairs-gps"
        variant="secondary"
        loading={status === 'loading'}
        onPress={useMyLocation}
      />
      {message ? (
        <AppText variant="caption" color={Colors.danger}>
          {message}
        </AppText>
      ) : null}

      <Group title="Or pick your nearest city" error={errors.location}>
        <View style={styles.chips}>
          {CITIES.map((city) => {
            const selected = draft.location?.city === city.city && draft.location.lat === city.lat;
            return <Chip key={city.city} label={city.city} selected={selected} onPress={() => onChange({ location: city })} />;
          })}
        </View>
      </Group>

      {draft.location ? (
        <Pressable style={styles.selectedLocation} accessibilityRole="text">
          <MaterialCommunityIcons name="map-marker-check" size={20} color={Colors.success} />
          <AppText variant="caption">Training near {draft.location.city}</AppText>
        </Pressable>
      ) : null}

      <Why>We use your location to show how far away each partner is and to keep suggestions local. It is never shown as an exact address.</Why>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.xl },
  group: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  photoButtons: { flex: 1, gap: Spacing.xs, alignItems: 'flex-start' },
  why: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  whyText: { flex: 1 },
  selectedLocation: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
