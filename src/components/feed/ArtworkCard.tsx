import { Clock, Heart, Star } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { CulturalItem } from '@/types/CulturalItem';
import { OptimizedImage } from '../ui/OptimizedImage';

type ArtworkCardProps = {
  item: CulturalItem;
  width: number;
  height: number;
  marginRight?: number;
  categoryColor: string;
  CategoryIcon: any;
  cinemaTypeLabel: string | null;
  isFavorite: boolean;
  isPending: boolean;
  isUpdatingFavorite: boolean;
  isUpdatingPending: boolean;
  onPress: (item: CulturalItem) => void;
  onToggleFavorite: (item: CulturalItem, e: any) => void;
  onTogglePending: (item: CulturalItem, e: any) => void;
};

export const ArtworkCard = React.memo(function ArtworkCard({
  item,
  width,
  height,
  marginRight = 0,
  categoryColor,
  CategoryIcon,
  cinemaTypeLabel,
  isFavorite,
  isPending,
  isUpdatingFavorite,
  isUpdatingPending,
  onPress,
  onToggleFavorite,
  onTogglePending,
}: ArtworkCardProps) {
  return (
    <TouchableOpacity
      style={{ width, marginRight }}
      activeOpacity={0.92}
      onPress={() => onPress(item)}
    >
      <View className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/90 shadow-md shadow-black/30">
        <View className="relative" style={{ width, height }}>
          <OptimizedImage
            source={{ uri: item.imageUrl }}
            style={{ width, height }}
            resizeMode="cover"
            placeholderColor="#1e293b"
            recyclingKey={item.id}
            priority="low"
          />
          <View
            style={{ backgroundColor: categoryColor }}
            className="absolute top-2 left-2 w-8 h-8 rounded-full items-center justify-center opacity-95"
          >
            <CategoryIcon size={16} color="white" />
          </View>
          <View className="absolute top-2 right-2 flex-row gap-1.5">
            <TouchableOpacity
              className="bg-black/55 w-8 h-8 rounded-full items-center justify-center"
              onPress={(e) => onToggleFavorite(item, e)}
              disabled={isUpdatingFavorite}
            >
              <Heart
                size={15}
                color={isFavorite ? '#ef4444' : 'white'}
                fill={isFavorite ? '#ef4444' : 'none'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-black/55 w-8 h-8 rounded-full items-center justify-center"
              onPress={(e) => onTogglePending(item, e)}
              disabled={isUpdatingPending}
            >
              <Clock
                size={15}
                color={isPending ? '#fbbf24' : 'white'}
                fill={isPending ? '#fbbf24' : 'none'}
              />
            </TouchableOpacity>
          </View>
          {cinemaTypeLabel ? (
            <View className="absolute bottom-2 left-2 rounded bg-black/65 px-1.5 py-0.5">
              <Text className="text-[9px] font-semibold uppercase tracking-wide text-white">
                {cinemaTypeLabel}
              </Text>
            </View>
          ) : null}
          {item.rating !== undefined ? (
            <View className="absolute bottom-2 right-2 flex-row items-center gap-0.5 rounded bg-black/65 px-1.5 py-0.5">
              <Star size={11} color="#fbbf24" fill="#fbbf24" />
              <Text className="text-[11px] font-semibold text-white">{item.rating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ minHeight: 92 }} className="px-2 pb-2 pt-2 justify-between">
          <Text numberOfLines={2} className="text-[13px] font-semibold leading-[17px] text-white">
            {item.title}
          </Text>
          <Text numberOfLines={1} className="mt-1 text-[11px] leading-[14px] text-slate-400">
            {[item.creator, item.year].filter(Boolean).join(' · ') || ' '}
          </Text>
          <Text numberOfLines={1} className="mt-1 text-[10px] text-slate-500">
            {item.metadata?.genres && item.metadata.genres.length > 0
              ? item.metadata.genres.slice(0, 2).join(' · ')
              : ' '}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});
