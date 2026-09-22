import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { IconButton } from '@/components/ui/ScreenHeader';
import { Colors, DisplayFont, MIN_TOUCH, Radius, Spacing } from '@/constants/theme';
import { AGE_GROUPS, HEIGHT_CLASSES, WEIGHT_CLASSES, classLabel } from '@/domain/classes';
import { describeResult } from '@/domain/fights';
import { formatDate } from '@/domain/format';
import { buildLeaderboard } from '@/domain/leaderboard';
import { computeStats, weeklyActivity } from '@/domain/stats';
import { useApp } from '@/state/AppContext';

type HistoryTab = 'sparrings' | 'matches';

export default function ProfileScreen() {
  const { profile, data, leaderboardPool, findProfile, cloud, isFighter, isJudge, identity } = useApp();
  const [tab, setTab] = useState<HistoryTab>('sparrings');

  const stats = useMemo(
    () => (data ? computeStats(data.swipes, data.matches, data.sessions) : null),
    [data],
  );
  const weeks = useMemo(() => weeklyActivity(data?.sessions ?? [], new Date()), [data?.sessions]);
  const rank = useMemo(() => {
    if (!profile || !data) return null;
    const rows = buildLeaderboard({ profiles: leaderboardPool, me: profile, mySessions: data.sessions, sport: null, nearKm: null });
    return rows.find((r) => r.isMe)?.rank ?? null;
  }, [profile, data, leaderboardPool]);

  if (!data) return null;

  // Judge-only account (database mode): show a minimal profile instead of the
  // fighter stats, which need a fighter profile that doesn't exist here.
  if (!profile) {
    return (
      <Screen scroll edges={['top']}>
        <View style={styles.topBar}>
          <AppText variant="title">Profile</AppText>
          <IconButton icon="cog-outline" label="Settings" onPress={() => router.push('/settings')} />
        </View>
        <View style={styles.hero}>
          <Avatar id="me" name={identity?.name ?? 'Judge'} size={96} />
          <View style={styles.heroText}>
            <AppText variant="title" numberOfLines={1}>
              {identity?.name ?? 'Judge'}
            </AppText>
            <Chip label="Judge" selected compact />
          </View>
        </View>
        {identity?.bio ? (
          <AppText dim style={styles.bio}>
            {identity.bio}
          </AppText>
        ) : null}
        <Button label="Open judge dashboard" icon="gavel" onPress={() => router.push('/judge')} style={styles.edit} />
      </Screen>
    );
  }

  if (!stats) return null;

  const peak = Math.max(1, ...weeks.map((w) => w.count));

  return (
    <Screen scroll edges={['top']}>
      <View style={styles.topBar}>
        <AppText variant="title">Profile</AppText>
        <IconButton icon="cog-outline" label="Settings" onPress={() => router.push('/settings')} />
      </View>

      <View style={styles.hero}>
        <Avatar id={profile.id} name={profile.name} photoUri={profile.photoUri} size={96} />
        <View style={styles.heroText}>
          <AppText variant="title" numberOfLines={1}>
            {profile.name}
          </AppText>
          <AppText dim>
            {[profile.level, profile.location.city].filter(Boolean).join(' · ')}
          </AppText>
          <AppText variant="caption" dim>
            {classLabel(AGE_GROUPS, profile.ageGroupId)} yrs · {classLabel(HEIGHT_CLASSES, profile.heightClassId)} ·{' '}
            {classLabel(WEIGHT_CLASSES, profile.weightClassId)}
          </AppText>
        </View>
      </View>

      <View style={styles.chips}>
        {profile.sports.map((s) => (
          <Chip key={s} label={s} selected compact />
        ))}
        {cloud && isFighter ? <Chip label="Fighter" compact /> : null}
        {cloud && isJudge ? <Chip label="Judge" compact /> : null}
      </View>
      {profile.bio ? <AppText dim style={styles.bio}>{profile.bio}</AppText> : null}
      <View style={styles.editRow}>
        <Button label="Edit profile" icon="pencil" variant="secondary" onPress={() => router.push('/edit-profile')} style={styles.editButton} />
        {cloud && isJudge ? (
          <Button label="Judge dashboard" icon="gavel" variant="secondary" onPress={() => router.push('/judge')} style={styles.editButton} />
        ) : null}
      </View>

      <AppText variant="label" dim style={styles.sectionLabel}>
        Your activity
      </AppText>
      <View style={styles.grid}>
        <Stat value={String(stats.sparrings)} label="Sparrings" icon="boxing-glove" />
        <Stat value={String(stats.matches)} label="Matches" icon="handshake-outline" />
        <Stat value={rank ? `#${rank}` : '—'} label="Ranking" icon="trophy-outline" />
        <Stat value={stats.matchRate === null ? '—' : `${stats.matchRate}%`} label="Match rate" icon="percent-outline" />
      </View>

      <View style={styles.chart} accessible accessibilityLabel={`Sparrings per week, last 6 weeks: ${weeks.map((w) => w.count).join(', ')}`}>
        <AppText variant="heading">Sparrings per week</AppText>
        <View style={styles.bars}>
          {weeks.map((w) => (
            <View key={w.label} style={styles.barCol}>
              <AppText variant="caption" dim>
                {w.count || ''}
              </AppText>
              <View style={[styles.bar, { height: 6 + (w.count / peak) * 70 }, w.count > 0 && styles.barFilled]} />
              <AppText variant="caption" dim>
                {w.label}
              </AppText>
            </View>
          ))}
        </View>
      </View>

      <AppText variant="label" dim style={styles.sectionLabel}>
        History
      </AppText>
      <View style={styles.segment}>
        <Chip label={`Sparrings (${data.sessions.length})`} selected={tab === 'sparrings'} onPress={() => setTab('sparrings')} />
        <Chip label={`Matches (${data.matches.length})`} selected={tab === 'matches'} onPress={() => setTab('matches')} />
      </View>

      <View style={styles.history}>
        {tab === 'sparrings' ? (
          data.sessions.length === 0 ? (
            <AppText dim>No sparrings yet. Open a chat with a match and log your first session.</AppText>
          ) : (
            data.sessions.map((s) => {
              const partner = findProfile(s.profileId);
              return (
                <View key={s.id} style={styles.historyRow}>
                  <MaterialCommunityIcons name="boxing-glove" size={24} color={Colors.primary} />
                  <View style={styles.historyText}>
                    <AppText variant="heading">
                      {s.sport} with {partner?.name ?? 'a fighter'}
                    </AppText>
                    <AppText variant="caption" dim>
                      {formatDate(s.at)}
                      {s.place ? ` · ${s.place}` : ''}
                    </AppText>
                  </View>
                  {s.result ? (
                    <Chip
                      label={describeResult(s.result)}
                      selected={s.result === 'win'}
                      compact
                    />
                  ) : null}
                </View>
              );
            })
          )
        ) : data.matches.length === 0 ? (
          <AppText dim>No matches yet. Keep swiping!</AppText>
        ) : (
          data.matches.map((m) => {
            const partner = findProfile(m.profileId);
            if (!partner) return null;
            return (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                accessibilityLabel={`Open chat with ${partner.name}`}
                onPress={() => router.push({ pathname: '/chat/[matchId]', params: { matchId: m.id } })}
                style={styles.historyRow}>
                <Avatar id={partner.id} name={partner.name} photoUri={partner.photoUri} size={40} />
                <View style={styles.historyText}>
                  <AppText variant="heading">{partner.name}</AppText>
                  <AppText variant="caption" dim>
                    Matched {formatDate(m.createdAt)}
                    {partner.location.city ? ` · ${partner.location.city}` : ''}
                  </AppText>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.textDim} />
              </Pressable>
            );
          })
        )}
      </View>
    </Screen>
  );
}

function Stat({ value, label, icon }: { value: string; label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <MaterialCommunityIcons name={icon} size={20} color={Colors.textDim} />
      <AppText style={styles.statValue}>{value}</AppText>
      <AppText variant="caption" dim>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginTop: Spacing.sm },
  heroText: { flex: 1, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.lg },
  bio: { marginTop: Spacing.md },
  edit: { marginTop: Spacing.lg },
  editRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.lg },
  editButton: { flexGrow: 1 },
  sectionLabel: { marginTop: Spacing.xl, marginBottom: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  stat: {
    flexGrow: 1,
    flexBasis: '47%',
    gap: 2,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  statValue: { fontFamily: DisplayFont, fontSize: 34, lineHeight: 40 },
  chart: { marginTop: Spacing.md, padding: Spacing.lg, borderRadius: Radius.md, backgroundColor: Colors.surface, gap: Spacing.md },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.sm },
  barCol: { flex: 1, alignItems: 'center', gap: Spacing.xs, justifyContent: 'flex-end' },
  bar: { width: '70%', borderRadius: 6, backgroundColor: Colors.border },
  barFilled: { backgroundColor: Colors.primary },
  segment: { flexDirection: 'row', gap: Spacing.sm },
  history: { marginTop: Spacing.md, gap: Spacing.sm },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: MIN_TOUCH + Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  historyText: { flex: 1 },
});
