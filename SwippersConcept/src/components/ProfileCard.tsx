import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { initialsOf } from '@/components/Avatar';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { Colors, DisplayFont, MIN_TOUCH, Radius, Spacing, gradientFor } from '@/constants/theme';
import { AGE_GROUPS, HEIGHT_CLASSES, WEIGHT_CLASSES, classLabel, getClass } from '@/domain/classes';
import { formatDistance } from '@/domain/geo';
import type { Profile } from '@/domain/types';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface Props {
  profile: Profile;
  distanceKm?: number;
  // 0–100 "fair match" score from the matching algorithm.
  score?: number;
  onReport?: () => void;
}

function Stat({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.stat}>
      <MaterialCommunityIcons name={icon} size={16} color={Colors.text} />
      <AppText variant="caption" style={styles.statText}>
        {text}
      </AppText>
    </View>
  );
}

// The swipe card (FK.02): photo, name, age, height, weight, martial art and
// distance, plus level, bio and the fair-match score.
export function ProfileCard({ profile, distanceKm, score, onReport }: Props) {
  const gradient = gradientFor(profile.id);

  return (
    <View style={styles.card}>
      {profile.photoUri ? (
        <Image source={{ uri: profile.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <LinearGradient colors={gradient} style={[StyleSheet.absoluteFill, styles.placeholder]}>
          <AppText style={styles.initials} accessibilityElementsHidden importantForAccessibility="no">
            {initialsOf(profile.name)}
          </AppText>
        </LinearGradient>
      )}

      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.95)']}
        locations={[0, 0.55, 1]}
        style={styles.shade}
        pointerEvents="none"
      />

      <View style={styles.topRow} pointerEvents="box-none">
        {score !== undefined ? (
          <View style={styles.score} accessibilityLabel={`${score} percent fair match`}>
            <MaterialCommunityIcons name="scale-balance" size={16} color={Colors.accent} />
            <AppText variant="caption" style={styles.scoreText}>
              {score}% fair match
            </AppText>
          </View>
        ) : (
          <View />
        )}
        {onReport ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Report ${profile.name}`}
            onPress={onReport}
            style={styles.report}>
            <MaterialCommunityIcons name="flag-outline" size={20} color={Colors.text} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.info} pointerEvents="none">
        <AppText style={styles.name} numberOfLines={1}>
          {profile.name}
        </AppText>

        <View style={styles.statsRow}>
          {/* Size and age are only shown when known: the database keeps other
              users' classes private. */}
          {getClass(AGE_GROUPS, profile.ageGroupId) ? (
            <Stat icon="calendar-account" text={`${classLabel(AGE_GROUPS, profile.ageGroupId)} yrs`} />
          ) : null}
          {getClass(HEIGHT_CLASSES, profile.heightClassId) ? (
            <Stat icon="human-male-height" text={classLabel(HEIGHT_CLASSES, profile.heightClassId)} />
          ) : null}
          {getClass(WEIGHT_CLASSES, profile.weightClassId) ? (
            <Stat icon="weight-kilogram" text={classLabel(WEIGHT_CLASSES, profile.weightClassId)} />
          ) : null}
          {distanceKm !== undefined ? <Stat icon="map-marker-outline" text={formatDistance(distanceKm)} /> : null}
        </View>

        <View style={styles.chips}>
          {profile.sports.map((sport) => (
            <Chip key={sport} label={sport} selected compact />
          ))}
          {profile.level ? <Chip label={profile.level} compact /> : null}
        </View>

        {profile.bio ? (
          <AppText variant="body" style={styles.bio} numberOfLines={3}>
            {profile.bio}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.lg + 4,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  placeholder: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: '18%' },
  initials: { fontFamily: DisplayFont, fontSize: 150, lineHeight: 170, color: 'rgba(255,255,255,0.28)' },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%' },
  topRow: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  score: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Radius.pill,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
  },
  scoreText: { fontWeight: '700' },
  report: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { position: 'absolute', left: Spacing.lg, right: Spacing.lg, bottom: Spacing.lg, gap: Spacing.sm },
  name: { fontFamily: DisplayFont, fontSize: 38, lineHeight: 44, textTransform: 'uppercase', letterSpacing: 0.5, color: Colors.text },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: Radius.pill,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  statText: { fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs + 2 },
  bio: { color: 'rgba(255,255,255,0.88)' },
});
