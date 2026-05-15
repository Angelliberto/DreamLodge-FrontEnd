import { Sparkles } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Text,
  View,
} from 'react-native';

type FeedRecommendationsLoaderProps = {
  headline: string;
};

/** Carga / generación del feed OCEAN: centrado, alineado con el tema oscuro de la app. */
export function FeedRecommendationsLoader({ headline }: FeedRecommendationsLoaderProps) {
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View className="w-full max-w-sm items-center self-center px-6">
      <Animated.View style={{ opacity: pulse }} className="mb-8">
        <ActivityIndicator size="large" color="#c084fc" />
      </Animated.View>

      <View className="mb-2 flex-row items-center justify-center gap-2">
        <Sparkles size={20} color="#a855f7" />
        <Text className="text-center text-lg font-semibold text-white">{headline}</Text>
      </View>

      <Text className="text-center text-sm leading-5 text-slate-400">
        Puede tardar hasta un minuto.
      </Text>
    </View>
  );
}
