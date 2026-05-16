import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { CulturalCategory } from '@/types/CulturalItem';

export function getCategoryColor(category: CulturalCategory): string {
  switch (category) {
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
      return '#94a3b8';
  }
}

export type CategoryTabIcon = React.ComponentType<{ size?: number; color?: string }>;

export type CategoryTab = {
  key: CulturalCategory;
  icon: CategoryTabIcon;
};

type CategoryIconTabBarProps = {
  tabs: CategoryTab[];
  /** Categorías activas (modo filtro: varias a la vez). */
  selectedKeys: CulturalCategory[];
  onToggle: (key: CulturalCategory) => void;
};

/** Barra horizontal de iconos por categoría (mismo estilo que artwork-details). */
export function CategoryIconTabBar({ tabs, selectedKeys, onToggle }: CategoryIconTabBarProps) {
  return (
    <View className="flex-row rounded-xl border border-slate-700/60 bg-slate-900/70 p-1">
      {tabs.map((tab) => {
        const isActive = selectedKeys.includes(tab.key);
        const TabIcon = tab.icon;
        const tabColor = getCategoryColor(tab.key);
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onToggle(tab.key)}
            activeOpacity={0.75}
            accessibilityLabel={tab.key}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            className={`flex-1 items-center rounded-lg py-3 ${isActive ? 'border' : ''}`}
            style={
              isActive
                ? {
                    borderColor: tabColor,
                    backgroundColor: `${tabColor}33`,
                  }
                : undefined
            }
          >
            <View
              className="items-center justify-center rounded-full"
              style={{
                width: 28,
                height: 28,
                backgroundColor: isActive ? tabColor : '#334155',
              }}
            >
              <TabIcon size={15} color="#ffffff" />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

type FeedFilterChipsProps = {
  filterCategories: CategoryTab[];
  selectedCategories: CulturalCategory[];
  toggleCategory: (category: CulturalCategory) => void;
};

export function FeedFilterChips({
  filterCategories,
  selectedCategories,
  toggleCategory,
}: FeedFilterChipsProps) {
  return (
    <View className="mt-3">

      <CategoryIconTabBar
        tabs={filterCategories}
        selectedKeys={selectedCategories}
        onToggle={toggleCategory}
      />
    </View>
  );
}
