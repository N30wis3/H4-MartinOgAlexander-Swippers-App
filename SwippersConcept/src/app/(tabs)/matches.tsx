import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { Colors, MIN_TOUCH, Radius, Spacing } from '@/constants/theme';
import { formatRecent } from '@/domain/format';
import { useMatchList, type MatchEntry } from '@/hooks/useMatchList';

function openChat(matchId: string) {
  router.push({ pathname: '/chat/[matchId]', params: { matchId } });
}

export default function MatchesScreen() {
  const entries = useMatchList();
  const fresh = entries.filter((e) => e.isNew);

  return (
    <Screen edges={['top']} padded={false}>
      <View style={styles.header}>
        <AppText variant="title">Matches</AppText>
      </View>

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="message-text-outline" size={64} color={Colors.textDim} />
          <AppText variant="title">No matches yet</AppText>
          <AppText dim style={styles.emptyText}>
            Swipe right on fighters you want to spar with. When they swipe right too, you can chat here.
          </AppText>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.match.id}
          ListHeaderComponent={fresh.length > 0 ? <NewMatches entries={fresh} /> : null}
          renderItem={({ item }) => <MatchRow entry={item} />}
          contentContainerStyle={styles.list}
        />
      )}
    </Screen>
  );
}

function NewMatches({ entries }: { entries: MatchEntry[] }) {
  return (
    <View style={styles.newSection}>
      <AppText variant="label" dim style={styles.sectionLabel}>
        New matches
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newRow}>
        {entries.map(({ match, profile }) => (
          <Pressable
            key={match.id}
            accessibilityRole="button"
            accessibilityLabel={`Say hi to ${profile.name}`}
            onPress={() => openChat(match.id)}
            style={styles.newItem}>
            <View style={[styles.ring, !match.seen && styles.ringUnseen]}>
              <Avatar id={profile.id} name={profile.name} photoUri={profile.photoUri} size={64} />
            </View>
            <AppText variant="caption" numberOfLines={1} style={styles.newName}>
              {profile.name.split(' ')[0]}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
      <AppText variant="label" dim style={styles.sectionLabel}>
        Messages
      </AppText>
    </View>
  );
}

function MatchRow({ entry }: { entry: MatchEntry }) {
  const { match, profile, lastMessage } = entry;
  const preview = lastMessage ? (lastMessage.from === 'me' ? `You: ${lastMessage.text}` : lastMessage.text) : 'Say hi!';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Chat with ${profile.name}${match.seen ? '' : ', new match'}`}
      onPress={() => openChat(match.id)}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: Colors.surface }]}>
      <Avatar id={profile.id} name={profile.name} photoUri={profile.photoUri} size={56} />
      <View style={styles.rowText}>
        <View style={styles.rowTop}>
          <AppText variant="heading" numberOfLines={1} style={styles.rowName}>
            {profile.name}
          </AppText>
          <AppText variant="caption" dim>
            {formatRecent(lastMessage?.at ?? match.createdAt)}
          </AppText>
        </View>
        <View style={styles.rowTop}>
          <AppText dim numberOfLines={1} style={[styles.rowName, !match.seen && styles.rowUnseen]}>
            {preview}
          </AppText>
          {!match.seen ? <View style={styles.dot} accessibilityLabel="New match" /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.lg, minHeight: 56, justifyContent: 'center' },
  list: { paddingBottom: Spacing.xl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  emptyText: { textAlign: 'center' },
  newSection: { paddingTop: Spacing.sm },
  sectionLabel: { paddingHorizontal: Spacing.lg, marginVertical: Spacing.sm },
  newRow: { paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  newItem: { alignItems: 'center', width: 72, gap: Spacing.xs, minHeight: MIN_TOUCH },
  ring: { padding: 3, borderRadius: 999, borderWidth: 2, borderColor: Colors.border },
  ringUnseen: { borderColor: Colors.primary },
  newName: { fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 72,
  },
  rowText: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  rowName: { flex: 1 },
  rowUnseen: { color: Colors.text, fontWeight: '700' },
  dot: { width: 10, height: 10, borderRadius: Radius.pill, backgroundColor: Colors.primary },
});
