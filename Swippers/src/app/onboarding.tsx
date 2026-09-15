import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { replaceUserKampsports, upsertUserConfig } from '@/lib/auth';
import { fetchLookups, Lookups } from '@/lib/lookups';
import { addGalleryPicture, getPictureUrl, pickImage, removePicture, replaceProfilePicture } from '@/lib/pictures';
import { supabase } from '@/lib/supabase';

type GalleryItem = { id: string; storage_path: string };

type LookupOptionLike = { id: number; label: string };

export default function OnboardingScreen() {
  const theme = useTheme();
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [loadError, setLoadError] = useState('');

  const [genderId, setGenderId] = useState<number | null>(null);
  const [seekingGenderId, setSeekingGenderId] = useState<number | null>(null);
  const [hoejdeId, setHoejdeId] = useState<number | null>(null);
  const [vaegtId, setVaegtId] = useState<number | null>(null);
  const [aldersgruppeId, setAldersgruppeId] = useState<number | null>(null);
  const [kampsportIds, setKampsportIds] = useState<Set<number>>(new Set());

  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState('50');
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [isUploadingProfilePic, setIsUploadingProfilePic] = useState(false);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [isUploadingGalleryPic, setIsUploadingGalleryPic] = useState(false);

  useEffect(() => {
    fetchLookups()
      .then(setLookups)
      .catch((err) => setLoadError(err?.message ?? 'Failed to load options.'));
  }, []);

  function findPictureTypeId(label: string): number | undefined {
    return lookups?.pictureTypes.find((t) => t.label === label)?.id;
  }

  async function handlePickProfilePicture(source: 'camera' | 'library') {
    const typeId = findPictureTypeId('profile_picture');
    if (!typeId) return;

    setIsUploadingProfilePic(true);
    setError('');
    try {
      const image = await pickImage(source);
      if (!image) return; // user cancelled

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in.');

      const saved = await replaceProfilePicture(user.id, typeId, image);
      setProfilePictureUrl(getPictureUrl(saved.storage_path));
    } catch (err: any) {
      setError(err?.message ?? 'Could not upload picture.');
    } finally {
      setIsUploadingProfilePic(false);
    }
  }

  async function handlePickGalleryPicture(source: 'camera' | 'library') {
    const typeId = findPictureTypeId('gallery');
    if (!typeId) return;

    setIsUploadingGalleryPic(true);
    setError('');
    try {
      const image = await pickImage(source);
      if (!image) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in.');

      const saved = await addGalleryPicture(user.id, typeId, image);
      setGallery((prev) => [...prev, { id: saved.id, storage_path: saved.storage_path }]);
    } catch (err: any) {
      setError(err?.message ?? 'Could not upload picture.');
    } finally {
      setIsUploadingGalleryPic(false);
    }
  }

  async function handleRemoveGalleryPicture(item: GalleryItem) {
    try {
      await removePicture(item.id, item.storage_path);
      setGallery((prev) => prev.filter((p) => p.id !== item.id));
    } catch (err: any) {
      setError(err?.message ?? 'Could not remove picture.');
    }
  }

  async function handleUseLocation() {
    setLocationStatus('loading');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('error');
        setError('Location permission is required to find matches near you.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setLocationStatus('done');
      setError('');
    } catch (err: any) {
      setLocationStatus('error');
      setError(err?.message ?? 'Could not get your location.');
    }
  }

  function toggleKampsport(id: number) {
    setKampsportIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    const radius = parseInt(searchRadius, 10);

    if (
      !genderId ||
      !seekingGenderId ||
      !hoejdeId ||
      !vaegtId ||
      !aldersgruppeId ||
      !coords ||
      !radius ||
      radius <= 0
    ) {
      setError('Please fill in every field, including location.');
      return;
    }
    if (!profilePictureUrl) {
      setError('Please add a profile picture.');
      return;
    }
    if (kampsportIds.size === 0) {
      setError('Pick at least one martial art.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in.');

      await upsertUserConfig({
        userId: user.id,
        genderId,
        seekingGenderId,
        hoejdeId,
        vaegtId,
        aldersgruppeId,
        longitude: coords.longitude,
        latitude: coords.latitude,
        searchRadius: radius,
      });
      await replaceUserKampsports(user.id, Array.from(kampsportIds));

      router.replace('/mainPage');
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.center}>
        <ThemedText style={styles.error}>{loadError}</ThemedText>
      </SafeAreaView>
    );
  }

  if (!lookups) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  function ChipRow({
    options,
    selectedId,
    onSelect,
  }: {
    options: LookupOptionLike[];
    selectedId: number | null;
    onSelect: (id: number) => void;
  }) {
    return (
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const isSelected = selectedId === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onSelect(opt.id)}
              style={[
                styles.chip,
                { backgroundColor: isSelected ? '#007AFF' : theme.backgroundElement },
              ]}>
              <ThemedText style={isSelected ? styles.chipTextSelected : undefined}>{opt.label}</ThemedText>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          Complete your profile
        </ThemedText>

        <Section label="Your gender">
          <ChipRow options={lookups.genders} selectedId={genderId} onSelect={setGenderId} />
        </Section>

        <Section label="Looking to match with">
          <ChipRow options={lookups.genders} selectedId={seekingGenderId} onSelect={setSeekingGenderId} />
        </Section>

        <Section label="Height">
          <ChipRow options={lookups.hoejde} selectedId={hoejdeId} onSelect={setHoejdeId} />
        </Section>

        <Section label="Weight">
          <ChipRow options={lookups.vaegt} selectedId={vaegtId} onSelect={setVaegtId} />
        </Section>

        <Section label="Age group">
          <ChipRow options={lookups.aldersgruppe} selectedId={aldersgruppeId} onSelect={setAldersgruppeId} />
        </Section>

        <Section label="Profile picture">
          {profilePictureUrl && (
            <Image source={{ uri: profilePictureUrl }} style={styles.profilePicPreview} />
          )}
          <View style={styles.chipRow}>
            <Pressable
              style={({ pressed }) => [styles.button, styles.smallButton, pressed && styles.buttonPressed]}
              onPress={() => handlePickProfilePicture('camera')}
              disabled={isUploadingProfilePic}>
              <ThemedText style={styles.buttonText}>
                {isUploadingProfilePic ? 'Uploading…' : 'Take photo'}
              </ThemedText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.button, styles.smallButton, pressed && styles.buttonPressed]}
              onPress={() => handlePickProfilePicture('library')}
              disabled={isUploadingProfilePic}>
              <ThemedText style={styles.buttonText}>
                {isUploadingProfilePic ? 'Uploading…' : 'Choose from library'}
              </ThemedText>
            </Pressable>
          </View>
        </Section>

        <Section label="Gallery (optional)">
          {gallery.length > 0 && (
            <View style={styles.chipRow}>
              {gallery.map((item) => (
                <View key={item.id} style={styles.galleryItem}>
                  <Image source={{ uri: getPictureUrl(item.storage_path) }} style={styles.galleryThumb} />
                  <Pressable style={styles.removeBadge} onPress={() => handleRemoveGalleryPicture(item)}>
                    <ThemedText style={styles.removeBadgeText}>✕</ThemedText>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <View style={styles.chipRow}>
            <Pressable
              style={({ pressed }) => [styles.button, styles.smallButton, pressed && styles.buttonPressed]}
              onPress={() => handlePickGalleryPicture('camera')}
              disabled={isUploadingGalleryPic}>
              <ThemedText style={styles.buttonText}>
                {isUploadingGalleryPic ? 'Uploading…' : 'Take photo'}
              </ThemedText>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.button, styles.smallButton, pressed && styles.buttonPressed]}
              onPress={() => handlePickGalleryPicture('library')}
              disabled={isUploadingGalleryPic}>
              <ThemedText style={styles.buttonText}>
                {isUploadingGalleryPic ? 'Uploading…' : 'Add from library'}
              </ThemedText>
            </Pressable>
          </View>
        </Section>

        <Section label="Martial arts you practice">
          <View style={styles.chipRow}>
            {lookups.kampsport.map((opt) => {
              const isSelected = kampsportIds.has(opt.id);
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => toggleKampsport(opt.id)}
                  style={[
                    styles.chip,
                    { backgroundColor: isSelected ? '#007AFF' : theme.backgroundElement },
                  ]}>
                  <ThemedText style={isSelected ? styles.chipTextSelected : undefined}>{opt.label}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section label="Location">
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleUseLocation}>
            <ThemedText style={styles.buttonText}>
              {locationStatus === 'loading'
                ? 'Getting location…'
                : locationStatus === 'done'
                  ? 'Location set ✓ — tap to refresh'
                  : 'Use my current location'}
            </ThemedText>
          </Pressable>

          <View style={styles.radiusRow}>
            <ThemedText>Search radius (km)</ThemedText>
            <TextInput
              style={[styles.radiusInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              keyboardType="number-pad"
              value={searchRadius}
              onChangeText={setSearchRadius}
            />
          </View>
        </Section>

        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

        <Pressable
          style={({ pressed }) => [styles.button, styles.submitButton, (pressed || isSubmitting) && styles.buttonPressed]}
          onPress={handleSubmit}
          disabled={isSubmitting}>
          <ThemedText style={styles.buttonText}>{isSubmitting ? 'Saving…' : 'Finish'}</ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    marginBottom: Spacing.two,
  },
  section: {
    gap: Spacing.two,
  },
  sectionLabel: {
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  smallButton: {
    flex: 1,
    paddingHorizontal: Spacing.two,
  },
  profilePicPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
  },
  galleryItem: {
    position: 'relative',
  },
  galleryThumb: {
    width: 80,
    height: 80,
    borderRadius: Spacing.two,
  },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 999,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 14,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  radiusInput: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    width: 80,
    textAlign: 'center',
  },
  error: {
    color: '#FF3B30',
  },
  button: {
    backgroundColor: '#3A3A3C',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    marginTop: Spacing.two,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
