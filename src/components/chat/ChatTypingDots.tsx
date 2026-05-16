import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const DOT = '#c084fc';

function BouncingDot({ delayMs }: { delayMs: number }) {
  const y = useSharedValue(0);

  useEffect(() => {
    const t = setTimeout(() => {
      y.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 340, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 340, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      );
    }, delayMs);
    return () => clearTimeout(t);
  }, [delayMs, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          width: 7,
          height: 7,
          borderRadius: 3.5,
          backgroundColor: DOT,
          marginHorizontal: 3,
        },
      ]}
    />
  );
}

/**
 * Indicador de “la IA está escribiendo…” más fluido que un spinner único.
 */
export function ChatTypingDots() {
  return (
    <View className="flex-row items-end justify-center pb-0.5" accessibilityLabel="La IA está escribiendo">
      <BouncingDot delayMs={0} />
      <BouncingDot delayMs={110} />
      <BouncingDot delayMs={220} />
    </View>
  );
}
