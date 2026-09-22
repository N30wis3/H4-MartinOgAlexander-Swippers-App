import { useCallback, useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Colors, DisplayFont, Radius, Spacing } from '@/constants/theme';
import type { RankedProfile } from '@/domain/matching';
import type { SwipeDirection } from '@/domain/types';

import { ProfileCard } from './ProfileCard';

export interface SwipeHandle {
  swipe(direction: SwipeDirection): void;
}

// -------------------------------------------------------------- one card

interface CardProps {
  ref?: Ref<SwipeHandle>;
  isTop: boolean;
  onSwiped: (direction: SwipeDirection) => void;
  children: React.ReactNode;
}

const FLY_OUT_MS = 220;

function SwipeCard({ ref, isTop, onSwiped, children }: CardProps) {
  const { width } = useWindowDimensions();
  const threshold = width * 0.28;
  const offscreen = width * 1.5;

  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(isTop ? 1 : 0.94);
  // Set once the card starts leaving, so a fling can't fire twice.
  const leaving = useSharedValue(false);

  useEffect(() => {
    scale.set(withSpring(isTop ? 1 : 0.94));
  }, [isTop, scale]);

  const finish = useCallback((direction: SwipeDirection) => onSwiped(direction), [onSwiped]);

  const flyOut = useCallback(
    (direction: SwipeDirection) => {
      if (leaving.get()) return;
      leaving.set(true);
      x.set(
        withTiming((direction === 'like' ? 1 : -1) * offscreen, { duration: FLY_OUT_MS }, (done) => {
          if (done) scheduleOnRN(finish, direction);
        }),
      );
    },
    [finish, leaving, offscreen, x],
  );

  // Lets the action buttons trigger the same animation as a drag.
  useImperativeHandle(ref, () => ({ swipe: flyOut }), [flyOut]);

  const pan = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((e) => {
      if (leaving.get()) return;
      x.set(e.translationX);
      y.set(e.translationY * 0.4);
    })
    .onEnd((e) => {
      if (leaving.get()) return;
      const dragged = x.get();
      if (dragged > threshold || (e.velocityX > 900 && dragged > 20)) {
        scheduleOnRN(flyOut, 'like');
      } else if (dragged < -threshold || (e.velocityX < -900 && dragged < -20)) {
        scheduleOnRN(flyOut, 'pass');
      } else {
        x.set(withSpring(0));
        y.set(withSpring(0));
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() },
      { translateY: y.get() },
      { rotate: `${interpolate(x.get(), [-width, 0, width], [-14, 0, 14], Extrapolation.CLAMP)}deg` },
      { scale: scale.get() },
    ],
  }));

  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.get(), [16, threshold], [0, 1], Extrapolation.CLAMP),
  }));
  const passStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.get(), [-threshold, -16], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, cardStyle]}>
        {children}
        <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampLike, likeStyle]}>
          <Animated.Text style={[styles.stampText, { color: Colors.success }]}>SPAR!</Animated.Text>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.stamp, styles.stampPass, passStyle]}>
          <Animated.Text style={[styles.stampText, { color: Colors.danger }]}>PASS</Animated.Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

// ------------------------------------------------------------------ deck

interface DeckProps {
  ref?: Ref<SwipeHandle>;
  items: RankedProfile[];
  onSwipe: (item: RankedProfile, direction: SwipeDirection) => void;
  onReport: (item: RankedProfile) => void;
}

// Shows the top card plus the next one peeking from behind. Card instances are
// keyed by profile id, so when the top card leaves the one behind it simply
// scales up instead of remounting.
export function SwipeDeck({ ref, items, onSwipe, onReport }: DeckProps) {
  const topRef = useRef<SwipeHandle>(null);
  useImperativeHandle(ref, () => ({ swipe: (d) => topRef.current?.swipe(d) }), []);

  const visible = items.slice(0, 2);

  return (
    <View style={styles.deck}>
      {[...visible].reverse().map((item) => {
        const isTop = item === visible[0];
        return (
          <View key={item.profile.id} style={StyleSheet.absoluteFill} pointerEvents={isTop ? 'auto' : 'none'}>
            <SwipeCard
              ref={isTop ? topRef : undefined}
              isTop={isTop}
              onSwiped={(direction) => onSwipe(item, direction)}>
              <ProfileCard
                profile={item.profile}
                distanceKm={item.distanceKm}
                score={item.score}
                onReport={isTop ? () => onReport(item) : undefined}
              />
            </SwipeCard>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  deck: { flex: 1 },
  card: { flex: 1, userSelect: 'none' },
  stamp: {
    position: 'absolute',
    top: 96,
    borderWidth: 4,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  stampLike: { left: Spacing.xl, borderColor: Colors.success, transform: [{ rotate: '-12deg' }] },
  stampPass: { right: Spacing.xl, borderColor: Colors.danger, transform: [{ rotate: '12deg' }] },
  stampText: { fontFamily: DisplayFont, fontSize: 40, lineHeight: 48, letterSpacing: 2 },
});
