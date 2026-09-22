import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { IconButton, ScreenHeader } from '@/components/ui/ScreenHeader';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { MAX_AGE, MIN_ADULT_AGE } from '@/domain/classes';
import { DEFAULT_FILTERS, DISTANCE_OPTIONS, recommend } from '@/domain/matching';
import { SPORTS, type Filters, type Sport } from '@/domain/types';
import { useApp } from '@/state/AppContext';
import { router } from 'expo-router';

const AGE_STEP = 1;

// FK.03: maximum distance, wanted martial arts and age span.
export default function FiltersScreen() {
  const { profile, data, pool, updateFilters } = useApp();
  const [filters, setFilters] = useState<Filters>(data?.filters ?? DEFAULT_FILTERS);

  // Live preview of how many fighters the current choices would show.
  const matching = useMemo(() => {
    if (!profile) return 0;
    return recommend({ me: profile, candidates: pool, excludedIds: new Set(), filters }).length;
  }, [profile, pool, filters]);

  function toggleSport(sport: Sport) {
    setFilters((f) => ({
      ...f,
      sports: f.sports.includes(sport) ? f.sports.filter((s) => s !== sport) : [...f.sports, sport],
    }));
  }

  // Keeps minAge <= maxAge and both inside the allowed range.
  function changeAge(which: 'minAge' | 'maxAge', delta: number) {
    setFilters((f) => {
      const value = f[which] + delta;
      if (which === 'minAge') return { ...f, minAge: Math.min(Math.max(value, MIN_ADULT_AGE), f.maxAge) };
      return { ...f, maxAge: Math.max(Math.min(value, MAX_AGE), f.minAge) };
    });
  }

  function apply() {
    updateFilters(filters);
    router.back();
  }

  return (
    <Screen scroll>
      <ScreenHeader title="Filters" back />

      <View style={styles.body}>
        <View style={styles.group}>
          <AppText variant="label" dim>
            Maximum distance
          </AppText>
          <View style={styles.chips}>
            {DISTANCE_OPTIONS.map((km) => (
              <Chip
                key={km ?? 'any'}
                label={km === null ? 'Any distance' : `${km} km`}
                selected={filters.maxDistanceKm === km}
                onPress={() => setFilters((f) => ({ ...f, maxDistanceKm: km }))}
              />
            ))}
          </View>
        </View>

        <View style={styles.group}>
          <AppText variant="label" dim>
            Martial arts
          </AppText>
          <View style={styles.chips}>
            {SPORTS.map((sport) => (
              <Chip key={sport} label={sport} selected={filters.sports.includes(sport)} onPress={() => toggleSport(sport)} />
            ))}
          </View>
          <AppText variant="caption" dim>
            {filters.sports.length === 0 ? 'Showing all martial arts.' : 'Only fighters who train at least one of these.'}
          </AppText>
        </View>

        <View style={styles.group}>
          <AppText variant="label" dim>
            Age range
          </AppText>
          <View style={styles.ages}>
            <Stepper label="From" value={filters.minAge} onMinus={() => changeAge('minAge', -AGE_STEP)} onPlus={() => changeAge('minAge', AGE_STEP)} />
            <Stepper label="To" value={filters.maxAge} onMinus={() => changeAge('maxAge', -AGE_STEP)} onPlus={() => changeAge('maxAge', AGE_STEP)} />
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <AppText dim style={styles.count} accessibilityLiveRegion="polite">
          {matching} {matching === 1 ? 'fighter matches' : 'fighters match'}
        </AppText>
        <Button label="Show fighters" onPress={apply} />
        <Button label="Reset filters" variant="ghost" onPress={() => setFilters(DEFAULT_FILTERS)} />
      </View>
    </Screen>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepper}>
      <AppText variant="caption" dim>
        {label}
      </AppText>
      <View style={styles.stepperRow}>
        <IconButton icon="minus-circle-outline" label={`Decrease ${label.toLowerCase()} age`} onPress={onMinus} />
        <AppText variant="title" accessibilityLabel={`${label} ${value} years`}>
          {value}
        </AppText>
        <IconButton icon="plus-circle-outline" label={`Increase ${label.toLowerCase()} age`} onPress={onPlus} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.xl, marginTop: Spacing.lg },
  group: { gap: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  ages: { flexDirection: 'row', gap: Spacing.md },
  stepper: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  footer: { marginTop: Spacing.xxl, gap: Spacing.sm },
  count: { textAlign: 'center' },
});
