import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { CulturalItem } from '@/types/CulturalItem';
import { ArtworkCard } from './ArtworkCard';

type RecommendationSectionProps = {
  title: string;
  items: CulturalItem[];
  itemWidth: number;
  itemHeight: number;
  getCategoryIcon: (cat: string) => any;
  getCategoryColor: (cat: string) => string;
  getCinemaTypeLabel: (item: CulturalItem) => string | null;
  favoriteIds: Map<string, { mongoId?: string }>;
  pendingIds: Map<string, { mongoId?: string }>;
  updatingItems: Set<string>;
  onPressItem: (item: CulturalItem) => void;
  onToggleFavorite: (item: CulturalItem, e: any) => void;
  onTogglePending: (item: CulturalItem, e: any) => void;
  leftIcon?: any;
  showCount?: boolean;
};

export const RecommendationSection = React.memo(function RecommendationSection({
  title,
  items,
  itemWidth,
  itemHeight,
  getCategoryIcon,
  getCategoryColor,
  getCinemaTypeLabel,
  favoriteIds,
  pendingIds,
  updatingItems,
  onPressItem,
  onToggleFavorite,
  onTogglePending,
  leftIcon,
  showCount = false,
}: RecommendationSectionProps) {
  const LeftIcon = leftIcon;

  return (
    <View className="mb-5">
      <View className="px-4 flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          {LeftIcon ? <LeftIcon size={17} color="#cbd5e1" /> : null}
          <Text className={`${LeftIcon ? 'ml-2 ' : ''}text-white text-lg font-semibold`}>{title}</Text>
        </View>
        {showCount ? <Text className="text-slate-400 text-xs">{items.length} títulos</Text> : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {items.map((item, index) => {
          const CategoryIcon = getCategoryIcon(item.category);
          const categoryColor = getCategoryColor(item.category);
          const isFavorite = favoriteIds.has(item.id);
          const isPending = pendingIds.has(item.id);
          const isUpdatingFavorite = updatingItems.has(`fav-${item.id}`);
          const isUpdatingPending = updatingItems.has(`pend-${item.id}`);
          const cinemaTypeLabel = getCinemaTypeLabel(item);

          return (
            <ArtworkCard
              key={`${title}-${item.id}`}
              item={item}
              width={itemWidth}
              height={itemHeight}
              marginRight={index === items.length - 1 ? 0 : 12}
              categoryColor={categoryColor}
              CategoryIcon={CategoryIcon}
              cinemaTypeLabel={cinemaTypeLabel}
              isFavorite={isFavorite}
              isPending={isPending}
              isUpdatingFavorite={isUpdatingFavorite}
              isUpdatingPending={isUpdatingPending}
              onPress={onPressItem}
              onToggleFavorite={onToggleFavorite}
              onTogglePending={onTogglePending}
            />
          );
        })}
      </ScrollView>
    </View>
  );
});
