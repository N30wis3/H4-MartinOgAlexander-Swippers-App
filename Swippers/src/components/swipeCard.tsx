import { PropsWithChildren } from "react";
import { StyleSheet } from "react-native";
import {
  GestureDetector,
  GestureHandlerRootView,
  Gesture,
} from "react-native-gesture-handler";
import Animated, {
  interpolate,
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Extrapolation,
} from "react-native-reanimated";

export function SwipeCard({ children }: PropsWithChildren) {
  const position = useSharedValue({ x: 0, y: 0 });
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      position.value = { x: e.translationX, y: e.translationY };
    })
    .onEnd(() => {
      position.value = withTiming({ x: 0, y: 0 }, { duration: 100 });

      

    });

    

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value.x }, { translateY: position.value.y },
      {
        rotate:
          interpolate(
            position.value.x,
            [-100, 0, 100],
            [-15, 0, 15],
            Extrapolation.EXTEND
          ) + 'deg',
      },],
  }));

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-around",
  },
  card: {
    flex: 1,
    width: "100%",
  },
});