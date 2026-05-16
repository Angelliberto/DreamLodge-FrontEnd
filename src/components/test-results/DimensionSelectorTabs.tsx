import React from 'react';
import { Star } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';

import { DIMENSION_NAMES } from '@/constants/oceanTestCopy';

type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

type Props = {
  dimensionKeysInOrder: string[];
  selectedDimension: string;
  setSelectedDimension: React.Dispatch<React.SetStateAction<string>>;
  dimensionIcons: Record<string, IconComponent>;
};

export function DimensionSelectorTabs({
  dimensionKeysInOrder,
  selectedDimension,
  setSelectedDimension,
  dimensionIcons
}: Props) {
  return (
    <View className="mb-6 flex-row gap-1">
      {dimensionKeysInOrder.map((key) => {
        const dimInfo = DIMENSION_NAMES[key];
        if (dimInfo === undefined) return null;
        const Icon = dimensionIcons[key] || Star;
        const isSelected = selectedDimension === key;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => setSelectedDimension(key)}
            className={`min-w-0 flex-1 items-center justify-center rounded-lg py-2 px-0.5 ${
              isSelected ? 'bg-purple-600' : 'bg-slate-700/50'
            }`}
          >
            <Icon size={17} color={isSelected ? 'white' : '#94a3b8'} />
            <Text
              className={`mt-1 text-center text-[9px] leading-[11px] ${
                isSelected ? 'text-white' : 'text-slate-400'
              }`}
              numberOfLines={3}
            >
              {dimInfo.es}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
