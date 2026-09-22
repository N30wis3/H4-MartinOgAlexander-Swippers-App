import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { Colors, DisplayFont, Radius, Spacing } from '@/constants/theme';
import { buildLeaderboard, type LeaderboardRow } from '@/domain/leaderboard';
import { SPORTS, type Sport } from '@/domain/types';
import { useApp } from '@/state/AppContext';

const LOCAL_RADIUS_KM = 50;
const MEDALS = ['#FFB020', '#C0C5CE', '#CD7F32'];

export default function LeaderboardScreen() {
  const { profile, data, leaderboardPool } = useApp();
  const [sport, setSport] = useState<Sport | null>(null);
  const [localOnly, setLocalOnly] = useState(false);

  const sessions = data?.sessions;
  const rows = useMemo(() => {
    if (!profile) return [];
    return buildLeaderboard({
      profiles: leaderboardPool,
      me: profile,
      mySessions: sessions ?? [],
      sport,
      nearKm: localOnly ? LOCAL_RADIUS_KM : null,
    });
  }, [profile, leaderboardPool, sessions, sport, localOnly]);

  const mine = rows.find((r) => r.isMe);

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.header}>
        <AppText variant="title">Ranking</AppText>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <Row row={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.filters}>
            {mine ? (
              <View style={styles.summary}>
                <AppText style={styles.summaryRank}>#{mine.rank}</AppText>
                <View style={styles.summaryText}>
                  <AppText variant="heading">Your rank</AppText>
                  <AppText dim>
                    {mine.count === 0
                      ? 'Log a sparring in a chat to get on the board.'
                      : `${mine.count} completed sparring${mine.count === 1 ? '' : 's'}`}
                  </AppText>
                </View>
              </View>
            ) : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Chip label="All martial arts" selected={sport === null} onPress={() => setSport(null)} />
              {SPORTS.map((s) => (
                <Chip key={s} label={s} selected={sport === s} onPress={() => setSport(s)} />
              ))}
            </ScrollView>

            <View style={styles.scope}>
              <Chip label="Everywhere" selected={!localOnly} onPress={() => setLocalOnly(false)} />
              <Chip label={`Near me (${LOCAL_RADIUS_KM} km)`} selected={localOnly} onPress={() => setLocalOnly(true)} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <AppText dim style={styles.empty}>
            Nobody has completed a sparring here yet.
          </AppText>
        }
      />
    </Screen>
  );
}

function Row({ row }: { row: LeaderboardRow }) {
  const medal = row.rank <= 3 && row.count > 0 ? MEDALS[row.rank - 1] : null;

  return (
    <View
      accessible
      accessibilityLabel={`Rank ${row.rank}, ${row.isMe ? 'you' : row.name}, ${row.count} sparrings`}
      style={[styles.row, row.isMe && styles.rowMe]}>
      <View style={styles.rank}>
        {medal ? (
          <MaterialCommunityIcons name="medal" size={28} color={medal} />
        ) : (
          <AppText variant="heading" dim>
            {row.rank}
          </AppText>
        )}
      </View>
      <Avatar id={row.id} name={row.name} photoUri={row.photoUri} size={48} />
      <View style={styles.rowText}>
        <AppText variant="heading" numberOfLines={1}>
          {row.isMe ? `${row.name} (you)` : row.name}
        </AppText>
        <AppText variant="caption" dim numberOfLines={1}>
          {[row.city, row.sports.join(', ')].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      <View style={styles.count}>
        <AppText style={styles.countNumber}>{row.count}</AppText>
        <AppText variant="caption" dim>
          sparrings
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.lg, minHeight: 56, justifyContent: 'center' },
  list: { paddingBottom: Spacing.xl },
  filters: { gap: Spacing.md, paddingBottom: Spacing.md },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  summaryRank: { fontFamily: DisplayFont, fontSize: 44, lineHeight: 50, color: Colors.text },
  summaryText: { flex: 1 },
  chipRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  scope: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  rowMe: { borderColor: Colors.primary },
  rank: { width: 32, alignItems: 'center' },
  rowText: { flex: 1 },
  count: { alignItems: 'flex-end' },
  countNumber: { fontFamily: DisplayFont, fontSize: 26, lineHeight: 30 },
  empty: { textAlign: 'center', padding: Spacing.xl },
});
