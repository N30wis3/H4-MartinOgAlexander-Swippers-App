import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useToast } from '@/components/ui/Toast';
import { Colors, MIN_TOUCH, Radius, Spacing } from '@/constants/theme';
import { fetchProfiles, type OpenFight } from '@/data/cloud';
import { formatRecent } from '@/domain/format';
import { useApp } from '@/state/AppContext';

interface FightRow extends OpenFight {
  fighters: { id: string; name: string; photoUri?: string }[];
}

// Fights waiting for any judge to accept, oldest request first. Two fighters
// create one of these by requesting a judge from their match chat.
export default function JudgeDashboard() {
  const { isJudge, listOpenFights, acceptFight } = useApp();
  const toast = useToast();
  const [rows, setRows] = useState<FightRow[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        const fights = await listOpenFights();
        const ids = [...new Set(fights.flatMap((f) => f.fighterIds))];
        const profiles = await fetchProfiles(ids);
        setRows(
          fights.map((f) => ({
            ...f,
            fighters: f.fighterIds.map((id) => {
              const p = profiles.get(id);
              return { id, name: p?.name ?? 'Fighter', photoUri: p?.photoUri };
            }),
          })),
        );
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Could not load open fights.', 'error');
      } finally {
        setRefreshing(false);
      }
    },
    [listOpenFights, toast],
  );

  useEffect(() => {
    if (isJudge) load();
  }, [isJudge, load]);

  async function accept(fight: FightRow) {
    setAcceptingId(fight.id);
    try {
      await acceptFight(fight.id);
      setRows((prev) => prev?.filter((f) => f.id !== fight.id) ?? null);
      toast('Fight accepted. Say hello!', 'success');
      router.push({ pathname: '/chat/[matchId]', params: { matchId: fight.chatroomId } });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not accept the fight.', 'error');
    } finally {
      setAcceptingId(null);
    }
  }

  if (!isJudge) {
    return (
      <Screen>
        <ScreenHeader title="Judge" back />
        <View style={styles.empty}>
          <MaterialCommunityIcons name="gavel" size={64} color={Colors.textDim} />
          <AppText variant="title">Not registered as a judge</AppText>
          <AppText dim style={styles.emptyText}>
            Add the judge role from Settings to referee fights.
          </AppText>
          <Button label="Open settings" onPress={() => router.push('/settings')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <ScreenHeader title="Open fights" back />
      </View>
      <FlatList
        data={rows ?? []}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load()} tintColor={Colors.text} />}
        renderItem={({ item }) => (
          <FightCard fight={item} accepting={acceptingId === item.id} onAccept={() => accept(item)} />
        )}
        ListEmptyComponent={
          rows !== null ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="gavel" size={64} color={Colors.textDim} />
              <AppText variant="title">No open fights</AppText>
              <AppText dim style={styles.emptyText}>
                When two matched fighters request a judge, they'll show up here.
              </AppText>
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

function FightCard({ fight, accepting, onAccept }: { fight: FightRow; accepting: boolean; onAccept: () => void }) {
  const [a, b] = fight.fighters;
  return (
    <View style={styles.card}>
      <View style={styles.fighters}>
        <FighterChip fighter={a} />
        <MaterialCommunityIcons name="sword-cross" size={20} color={Colors.textDim} />
        <FighterChip fighter={b} />
      </View>
      <AppText variant="caption" dim>
        Requested {formatRecent(fight.requestedAt)}
      </AppText>
      <Button label="Accept" icon="gavel" loading={accepting} onPress={onAccept} />
    </View>
  );
}

function FighterChip({ fighter }: { fighter?: { id: string; name: string; photoUri?: string } }) {
  if (!fighter) return <AppText dim>Unknown fighter</AppText>;
  return (
    <View style={styles.fighterChip}>
      <Avatar id={fighter.id} name={fighter.name} photoUri={fighter.photoUri} size={36} />
      <AppText variant="caption" numberOfLines={1} style={styles.fighterName}>
        {fighter.name}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.lg },
  list: { padding: Spacing.lg, gap: Spacing.md },
  card: {
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fighters: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  fighterChip: { flex: 1, alignItems: 'center', gap: Spacing.xs, minHeight: MIN_TOUCH },
  fighterName: { textAlign: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl, marginTop: Spacing.xxl },
  emptyText: { textAlign: 'center' },
});
