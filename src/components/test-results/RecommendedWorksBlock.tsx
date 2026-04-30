import React, { useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import type { CulturalItem } from '@/types/CulturalItem';
import { CulturalGridItem } from '../cultural/CulturalGridItem';

type Props = {
  profileWorksLoading: boolean;
  suggestedWorksKey: string;
  profileWorkItems: CulturalItem[];
  recItemWidth: number;
  recGap: number;
  handleRecommendationPress: (item: CulturalItem) => void;
};

export function RecommendedWorksBlock({
  profileWorksLoading,
  suggestedWorksKey,
  profileWorkItems,
  recItemWidth,
  recGap,
  handleRecommendationPress
}: Props) {
  const featuredWorks = useMemo(() => {
    const byCategory = new Set<string>();
    const selected: CulturalItem[] = [];

    for (const item of profileWorkItems) {
      if (byCategory.has(item.category)) continue;
      byCategory.add(item.category);
      selected.push(item);
      if (selected.length === 5) break;
    }

    return selected;
  }, [profileWorkItems]);

  if (!(profileWorksLoading || !!suggestedWorksKey || profileWorkItems.length > 0)) {
    return null;
  }

  return (
    <View className="mt-5 border-t border-slate-700/60 pt-4">
      <Text className="mb-1 text-sm font-semibold text-white">
        Recomendacion principal
      </Text>
      <Text className="mb-3 text-xs text-slate-500">
        Recomendaciones principales: una obra por tipo segun tu perfil artistico.
      </Text>
      {profileWorksLoading ? (
        <View className="items-center py-4">
          <ActivityIndicator color="#a855f7" />
          <Text className="mt-2 text-xs text-slate-500">Resolviendo obras…</Text>
        </View>
      ) : featuredWorks.length > 0 ? (
        <View className="flex-row flex-wrap">
          {featuredWorks.map((item, index) => (
            <CulturalGridItem
              key={item.id}
              item={item}
              itemWidth={recItemWidth}
              gap={recGap}
              index={index}
              onPress={handleRecommendationPress}
            />
          ))}
        </View>
      ) : suggestedWorksKey ? (
        <Text className="text-xs leading-5 text-slate-500">
          No encontramos coincidencias en las APIs para estas obras. Prueba en Explorar más tarde.
        </Text>
      ) : null}
    </View>
  );
}
