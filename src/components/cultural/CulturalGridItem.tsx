import { Book, Film, Gamepad2, Music2, Palette } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { OptimizedImage } from '../ui/OptimizedImage';
import type { CulturalItem } from '../../types/CulturalItem';

type Props = {
  item: CulturalItem;
  itemWidth: number;
  gap: number;
  index: number;
  onPress: (item: CulturalItem) => void;
};

/**
 * Tarjeta compacta de obra (misma lógica que la cuadrícula del perfil).
 */
export const CulturalGridItem = React.memo(
  ({ item, itemWidth, gap, index, onPress }: Props) => {
    const CategoryIcon = useMemo(() => {
      switch (item.category) {
        case 'cine':
          return Film;
        case 'videojuegos':
          return Gamepad2;
        case 'literatura':
          return Book;
        case 'musica':
          return Music2;
        case 'arte-visual':
          return Palette;
        default:
          return Film;
      }
    }, [item.category]);

    const categoryColor = useMemo(() => {
      switch (item.category) {
        case 'cine':
          return '#3b82f6';
        case 'videojuegos':
          return '#a855f7';
        case 'literatura':
          return '#facc15';
        case 'musica':
          return '#22c55e';
        case 'arte-visual':
          return '#f472b6';
        default:
          return '#666';
      }
    }, [item.category]);

    const isLastInRow = (index + 1) % 3 === 0;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onPress(item)}
        style={{
          width: itemWidth,
          marginBottom: 8,
          marginRight: isLastInRow ? 0 : gap,
        }}
      >
        <View className="overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/90">
          <OptimizedImage
            source={{ uri: item.imageUrl }}
            style={{ width: '100%', height: 120 }}
            resizeMode="cover"
            className="bg-slate-700"
            placeholderColor="#1e293b"
          />
          <View className="p-2">
            <View className="mb-1 flex-row items-center gap-1">
              <View
                style={{ backgroundColor: categoryColor }}
                className="h-4 w-4 items-center justify-center rounded-full"
              >
                <CategoryIcon size={8} color="white" />
              </View>
              <Text className="flex-1 text-[10px] text-slate-400" numberOfLines={1}>
                {item.category}
              </Text>
            </View>
            <Text className="mb-1 text-xs font-semibold text-white" numberOfLines={2}>
              {item.title}
            </Text>
            <Text className="text-[10px] text-slate-300" numberOfLines={1}>
              {item.creator}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.itemWidth === next.itemWidth &&
    prev.index === next.index
);

CulturalGridItem.displayName = 'CulturalGridItem';
