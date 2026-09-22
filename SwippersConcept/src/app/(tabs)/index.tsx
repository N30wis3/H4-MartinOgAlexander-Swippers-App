import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MatchOverlay } from '@/components/MatchOverlay';
import { ReportSheet } from '@/components/ReportSheet';
import { SwipeDeck, type SwipeHandle } from '@/components/SwipeDeck';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { IconButton } from '@/components/ui/ScreenHeader';
import { useToast } from '@/components/ui/Toast';
import { Colors, DisplayFont, Spacing } from '@/constants/theme';
import { countActiveFilters, recommend, type RankedProfile } from '@/domain/matching';
import type { Match, SwipeDirection } from '@/domain/types';
import { useApp } from '@/state/AppContext';
import { excludedProfileIds } from '@/state/store';

// Haptics are a nicety; they are not supported everywhere (e.g. web).
function buzz(kind: 'light' | 'success') {
  const run = kind === 'success' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  run.catch(() => {});
}

export default function DiscoverScreen() {
  const { profile, data, pool, cloud, cloudError, identity, findProfile, refreshPool, swipe, markMatchSeen, reportProfile } = useApp();
  const toast = useToast();
  const deckRef = useRef<SwipeHandle>(null);
  const [newMatch, setNewMatch] = useState<Match | null>(null);
  const [reporting, setReporting] = useState<RankedProfile | null>(null);

  // Ranked suggestions (FK.03). Recomputed whenever a swipe, report or filter
  // changes; swiped and reported profiles drop out of the list.
  const items = useMemo(() => {
    if (!profile || !data) return [];
    return recommend({
      me: profile,
      candidates: pool,
      excludedIds: excludedProfileIds(data),
      filters: data.filters,
    });
  }, [profile, data, pool]);

  if (!data) return null;

  // Judge-only account (database mode): nothing here to swipe on.
  if (!profile) {
    return (
      <Screen edges={['top']} padded={false}>
        <View style={styles.header}>
          <AppText style={styles.brand}>Swippers</AppText>
        </View>
        <View style={styles.empty}>
          <MaterialCommunityIcons name="gavel" size={64} color={Colors.textDim} />
          <AppText variant="title">{identity ? `Hi ${identity.name.split(' ')[0]}` : "You're a judge"}</AppText>
          <AppText dim style={styles.emptyText}>
            You're signed in as a judge. Review open fight requests and accept one to referee.
          </AppText>
          <Button label="Open judge dashboard" onPress={() => router.push('/judge')} />
        </View>
      </Screen>
    );
  }

  const filters = data.filters;

  const activeFilters = countActiveFilters(filters);
  const partner = newMatch ? (findProfile(newMatch.profileId) ?? null) : null;

  function handleSwipe(item: RankedProfile, direction: SwipeDirection) {
    swipe(item.profile, direction)
      .then((match) => {
        if (match) {
          buzz('success');
          setNewMatch(match);
        }
      })
      .catch((err) => toast(err instanceof Error ? err.message : 'Could not save your swipe.', 'error'));
  }

  function press(direction: SwipeDirection) {
    buzz('light');
    deckRef.current?.swipe(direction);
  }

  function submitReport(reason: string) {
    if (!reporting) return;
    const target = reporting;
    setReporting(null);
    reportProfile(target.profile.id, reason)
      .then(() => toast("Thanks, we'll review this profile. You won't see it again.", 'success'))
      .catch((err) => toast(err instanceof Error ? err.message : 'Could not send the report.', 'error'));
  }

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.header}>
        <AppText style={styles.brand}>Swippers</AppText>
        <IconButton
          icon="tune-variant"
          label={activeFilters > 0 ? `Filters, ${activeFilters} active` : 'Filters'}
          badge={activeFilters || undefined}
          onPress={() => router.push('/filters')}
        />
      </View>

      {items.length > 0 ? (
        <>
          <View style={styles.deck}>
            <SwipeDeck ref={deckRef} items={items} onSwipe={handleSwipe} onReport={setReporting} />
          </View>
          <View style={styles.actions}>
            <RoundButton icon="close" label="Pass" color={Colors.danger} onPress={() => press('pass')} />
            <RoundButton icon="boxing-glove" label="Spar" color={Colors.onPrimary} filled large onPress={() => press('like')} />
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="account-search-outline" size={64} color={Colors.textDim} />
          <AppText variant="title">No fighters left</AppText>
          <AppText dim style={styles.emptyText}>
            {cloudError
              ? cloudError
              : activeFilters > 0
                ? 'Nobody matches your filters right now. Try a wider distance or more martial arts.'
                : "You've seen everyone nearby. Check back soon for new fighters."}
          </AppText>
          {cloud ? <Button label="Refresh" variant="secondary" onPress={() => refreshPool().catch(() => {})} /> : null}
          {activeFilters > 0 ? <Button label="Adjust filters" onPress={() => router.push('/filters')} /> : null}
        </View>
      )}

      <MatchOverlay
        visible={newMatch !== null}
        me={profile}
        partner={partner}
        onMessage={() => {
          if (!newMatch) return;
          markMatchSeen(newMatch.id);
          setNewMatch(null);
          router.push({ pathname: '/chat/[matchId]', params: { matchId: newMatch.id } });
        }}
        onKeepSwiping={() => setNewMatch(null)}
      />

      <ReportSheet name={reporting?.profile.name ?? null} onSelect={submitReport} onClose={() => setReporting(null)} />
    </Screen>
  );
}

function RoundButton({
  icon,
  label,
  color,
  filled,
  large,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  color: string;
  filled?: boolean;
  large?: boolean;
  onPress: () => void;
}) {
  const size = large ? 76 : 64;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.round,
        { width: size, height: size, borderRadius: size / 2 },
        filled ? { backgroundColor: Colors.primary } : { borderColor: color, borderWidth: 2 },
        pressed && { transform: [{ scale: 0.94 }] },
      ]}>
      <MaterialCommunityIcons name={icon} size={large ? 38 : 32} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    minHeight: 56,
  },
  brand: { fontFamily: DisplayFont, fontSize: 28, letterSpacing: 1, color: Colors.primary, textTransform: 'uppercase' },
  deck: { flex: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  round: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  emptyText: { textAlign: 'center', marginBottom: Spacing.md },
});
