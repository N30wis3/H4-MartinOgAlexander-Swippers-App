import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { ReportSheet } from '@/components/ReportSheet';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { IconButton } from '@/components/ui/ScreenHeader';
import { Sheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Colors, MIN_TOUCH, Radius, Spacing } from '@/constants/theme';
import { fetchProfiles, type FightInfo } from '@/data/cloud';
import { QUICK_REPLIES } from '@/domain/chat';
import { describeFightStatus } from '@/domain/fights';
import { formatTime } from '@/domain/format';
import { sharedSports } from '@/domain/matching';
import { SPORTS, type Message, type Sport } from '@/domain/types';
import { useApp } from '@/state/AppContext';

const FIGHT_POLL_MS = 6000;

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const {
    data,
    profile,
    account,
    cloud,
    findProfile,
    markMatchSeen,
    sendMessage,
    logSparring,
    reportProfile,
    requestJudgeForMatch,
    getFightForMatch,
    completeFight,
  } = useApp();
  const toast = useToast();

  const [text, setText] = useState('');
  const [logging, setLogging] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [sport, setSport] = useState<Sport | null>(null);
  const [place, setPlace] = useState('');
  const [fight, setFight] = useState<FightInfo | null>(null);
  const [fightNames, setFightNames] = useState<Record<string, string>>({});
  const [requestingJudge, setRequestingJudge] = useState(false);
  const [recordingResult, setRecordingResult] = useState(false);

  const match = data?.matches.find((m) => m.id === matchId);
  const partner = match ? findProfile(match.profileId) : undefined;
  const thread = data?.messages[matchId] ?? [];

  // Opening the conversation clears the "new match" badge.
  useEffect(() => {
    if (match && !match.seen) markMatchSeen(match.id);
  }, [match, markMatchSeen]);

  // Fight status (database mode only) — whether a judge has been requested,
  // accepted, or has already recorded a result for this match.
  const refreshFight = useCallback(async () => {
    if (!cloud || !matchId) return;
    try {
      const info = await getFightForMatch(matchId);
      setFight(info);
      const ids = info ? [...new Set([info.judgeId, info.winnerId, ...info.fighterIds].filter((id): id is string => !!id))] : [];
      if (ids.length === 0) {
        setFightNames({});
        return;
      }
      const profiles = await fetchProfiles(ids);
      setFightNames(Object.fromEntries(ids.map((id) => [id, profiles.get(id)?.name ?? 'Someone'])));
    } catch {
      // Non-fatal: the banner just stays hidden if this fails.
    }
  }, [cloud, matchId, getFightForMatch]);

  useEffect(() => {
    refreshFight();
  }, [refreshFight]);

  useEffect(() => {
    if (!cloud) return;
    const timer = setInterval(refreshFight, FIGHT_POLL_MS);
    return () => clearInterval(timer);
  }, [cloud, refreshFight]);

  // Sports both fighters train come first; those are the likeliest to be sparred.
  const sportOptions = useMemo(() => {
    if (!partner || !profile) return [...SPORTS];
    const shared = sharedSports(profile.sports, partner.sports);
    return [...shared, ...SPORTS.filter((s) => !shared.includes(s))];
  }, [partner, profile]);

  // `profile` is intentionally not required here: a judge-only account (no
  // fighter profile) can still open a fight's chat once they've been added
  // to it. `sportOptions` above already falls back safely when it's absent.
  if (!match || !partner) {
    return (
      <Screen>
        <View style={styles.missing}>
          <AppText variant="title">Chat not found</AppText>
          <Button label="Back to matches" onPress={() => router.replace('/matches')} />
        </View>
      </Screen>
    );
  }

  function send(message: string) {
    sendMessage(match!.id, message).catch((err) =>
      toast(err instanceof Error ? err.message : 'Could not send the message.', 'error'),
    );
    setText('');
  }

  function submitSparring() {
    const chosen = sport ?? sportOptions[0];
    logSparring(match!.id, chosen, place);
    setLogging(false);
    setPlace('');
    setSport(null);
    toast('Sparring logged. It now counts towards your stats and ranking.', 'success');
  }

  function submitReport(reason: string) {
    setReporting(false);
    reportProfile(partner!.id, reason)
      .then(() => {
        toast("Thanks, we'll review this profile.", 'success');
        router.replace('/matches');
      })
      .catch((err) => toast(err instanceof Error ? err.message : 'Could not send the report.', 'error'));
  }

  async function askForJudge() {
    setRequestingJudge(true);
    try {
      await requestJudgeForMatch(match!.id);
      await refreshFight();
      toast("Judge requested — we'll show it here once one accepts.", 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not request a judge.', 'error');
    } finally {
      setRequestingJudge(false);
    }
  }

  async function recordResult(outcome: { winnerId: string | null; isDraw: boolean }) {
    if (!fight) return;
    setRecordingResult(true);
    try {
      await completeFight(fight.id, outcome);
      await refreshFight();
      toast('Result recorded.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not record the result.', 'error');
    } finally {
      setRecordingResult(false);
    }
  }

  // FlatList is inverted so the newest message sits at the bottom.
  const newestFirst = [...thread].reverse();

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" label="Back to matches" onPress={() => (router.canGoBack() ? router.back() : router.replace('/matches'))} />
        <Avatar id={partner.id} name={partner.name} photoUri={partner.photoUri} size={40} />
        <View style={styles.headerText}>
          <AppText variant="heading" numberOfLines={1}>
            {partner.name}
          </AppText>
          <AppText variant="caption" dim numberOfLines={1}>
            {partner.sports.join(' · ')}
          </AppText>
        </View>
        {/* In database mode sparring comes from fights arranged with a judge, so
            there is no manual logging. */}
        {cloud ? null : (
          <IconButton icon="clipboard-check-outline" label="Log completed sparring" onPress={() => setLogging(true)} />
        )}
        <IconButton icon="flag-outline" label={`Report ${partner.name}`} onPress={() => setReporting(true)} />
      </View>

      {cloud ? (
        <FightBanner
          fight={fight}
          names={fightNames}
          isJudgeHere={!!account && !!fight && fight.judgeId === account.id}
          requesting={requestingJudge}
          recording={recordingResult}
          onRequestJudge={askForJudge}
          onRecordResult={recordResult}
        />
      ) : null}

      <FlatList
        inverted
        data={newestFirst}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <Bubble message={item} />}
        contentContainerStyle={styles.messages}
      />

      {thread.filter((m) => m.from === 'me').length < 2 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quick} style={styles.quickWrap}>
          {QUICK_REPLIES.map((q) => (
            <Chip key={q} label={q} onPress={() => send(q)} />
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Message"
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor={Colors.textFaint}
          style={styles.input}
          multiline
          maxLength={1000}
          onSubmitEditing={() => text.trim() && send(text)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          disabled={!text.trim()}
          onPress={() => send(text)}
          style={[styles.send, !text.trim() && { opacity: 0.4 }]}>
          <MaterialCommunityIcons name="send" size={22} color={Colors.onPrimary} />
        </Pressable>
      </View>

      <Sheet visible={logging} onClose={() => setLogging(false)} title="Log sparring">
        <AppText dim>Did you and {partner.name} spar? Log it so it counts towards your stats and the leaderboard.</AppText>
        <View style={styles.chips}>
          {sportOptions.map((s) => (
            <Chip key={s} label={s} selected={(sport ?? sportOptions[0]) === s} onPress={() => setSport(s)} />
          ))}
        </View>
        <TextField label="Where? (optional)" value={place} onChangeText={setPlace} maxLength={60} placeholder="e.g. Iron Fist Gym" />
        <Button label="Log sparring" icon="check" onPress={submitSparring} />
      </Sheet>

      <ReportSheet name={reporting ? partner.name : null} onSelect={submitReport} onClose={() => setReporting(false)} />
    </Screen>
  );
}

// A real, judged fight is separate from local/demo "sparring": it needs a
// judge to accept the request and later record who won (domain/fights.ts).
function FightBanner({
  fight,
  names,
  isJudgeHere,
  requesting,
  recording,
  onRequestJudge,
  onRecordResult,
}: {
  fight: FightInfo | null;
  names: Record<string, string>;
  isJudgeHere: boolean;
  requesting: boolean;
  recording: boolean;
  onRequestJudge: () => void;
  onRecordResult: (outcome: { winnerId: string | null; isDraw: boolean }) => void;
}) {
  if (!fight) {
    return (
      <View style={styles.fightBanner}>
        <View style={styles.fightRow}>
          <MaterialCommunityIcons name="gavel" size={18} color={Colors.accent} />
          <AppText variant="caption" dim style={styles.fightText}>
            Want an official result? Request a judge for this fight.
          </AppText>
        </View>
        <Button label="Request a judge" variant="secondary" loading={requesting} onPress={onRequestJudge} />
      </View>
    );
  }

  const judgeName = fight.judgeId ? (names[fight.judgeId] ?? 'The judge') : null;

  return (
    <View style={styles.fightBanner}>
      <View style={styles.fightRow}>
        <MaterialCommunityIcons name="gavel" size={18} color={Colors.accent} />
        <AppText variant="caption" style={styles.fightText}>
          {describeFightStatus(fight.status, judgeName)}
        </AppText>
      </View>

      {fight.status === 'completed' ? (
        <AppText variant="caption" dim>
          {fight.isDraw ? 'Draw.' : fight.winnerId ? `${names[fight.winnerId] ?? 'A fighter'} won.` : 'No result recorded.'}
        </AppText>
      ) : null}

      {isJudgeHere && fight.status === 'scheduled' ? (
        <View style={styles.judgeTools}>
          <AppText variant="caption" dim>
            Who won?
          </AppText>
          <View style={styles.judgeButtons}>
            {fight.fighterIds.map((id) => (
              <Button
                key={id}
                label={names[id] ?? 'Fighter'}
                variant="secondary"
                loading={recording}
                onPress={() => onRecordResult({ winnerId: id, isDraw: false })}
              />
            ))}
            <Button label="Draw" variant="ghost" loading={recording} onPress={() => onRecordResult({ winnerId: null, isDraw: true })} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Bubble({ message }: { message: Message }) {
  if (message.from === 'system') {
    return (
      <View style={styles.systemWrap}>
        <AppText variant="caption" dim style={styles.system}>
          {message.text}
        </AppText>
      </View>
    );
  }

  const mine = message.from === 'me';
  return (
    <View style={[styles.bubbleWrap, mine ? styles.mine : styles.theirs]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <AppText>{message.text}</AppText>
      </View>
      <AppText variant="caption" dim style={styles.time}>
        {formatTime(message.at)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerText: { flex: 1 },
  messages: { padding: Spacing.lg, gap: Spacing.sm },
  bubbleWrap: { maxWidth: '80%', gap: 2 },
  mine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.lg, borderRadius: Radius.lg },
  bubbleMine: { backgroundColor: Colors.primary, borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: Colors.surfaceHigh, borderBottomLeftRadius: 6 },
  time: { fontSize: 11 },
  systemWrap: { alignItems: 'center', paddingVertical: Spacing.sm },
  system: { textAlign: 'center', maxWidth: '85%' },
  quickWrap: { flexGrow: 0 },
  quick: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.sm },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    minHeight: MIN_TOUCH,
    maxHeight: 120,
    color: Colors.text,
    fontSize: 16,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  send: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  fightBanner: {
    gap: Spacing.sm,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fightRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  fightText: { flex: 1 },
  judgeTools: { gap: Spacing.sm, marginTop: Spacing.xs },
  judgeButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
