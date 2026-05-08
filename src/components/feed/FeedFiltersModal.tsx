import { Check, X } from 'lucide-react-native';
import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { CulturalCategory } from '@/types/CulturalItem';

type FilterCategoryOption = {
  key: CulturalCategory;
  label: string;
  icon: any;
};

type FeedFiltersModalProps = {
  visible: boolean;
  onClose: () => void;
  filterCategories: FilterCategoryOption[];
  selectedCategories: CulturalCategory[];
  toggleCategory: (category: CulturalCategory) => void;
  availableGenres: string[];
  selectedGenres: string[];
  toggleGenre: (genre: string) => void;
  clearFilters: () => void;
};

export function FeedFiltersModal({
  visible,
  onClose,
  filterCategories,
  selectedCategories,
  toggleCategory,
  availableGenres,
  selectedGenres,
  toggleGenre,
  clearFilters,
}: FeedFiltersModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 flex-row bg-black/45">
        <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />

        <View className="w-[88%] max-w-[390px] bg-slate-900 h-full border-l border-slate-700">
          <View className="px-4 pt-5 pb-3 border-b border-slate-700 flex-row items-start justify-between">
            <View className="pr-2">
              <Text className="text-[24px] font-bold text-white">Filtros</Text>
              <Text className="text-sm text-slate-400 mt-1">
                Filtra por arte y género
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2 rounded-full">
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 pt-3" showsVerticalScrollIndicator={false}>
            <Text className="text-[18px] font-semibold text-white mb-2">Tipo de Arte</Text>
            <View className="mb-4">
              {filterCategories.map((row) => {
                const Icon = row.icon;
                const selected = selectedCategories.includes(row.key);
                return (
                  <TouchableOpacity
                    key={row.key}
                    className="flex-row items-center mb-2.5"
                    onPress={() => toggleCategory(row.key)}
                    activeOpacity={0.8}
                  >
                    <View
                      className={`w-5 h-5 rounded-[6px] border mr-3 items-center justify-center ${
                        selected ? 'bg-purple-500 border-purple-500' : 'bg-slate-800 border-slate-600'
                      }`}
                    >
                      {selected && <Check size={12} color="white" />}
                    </View>
                    <Icon size={16} color="#cbd5e1" />
                    <Text className="ml-2 text-[17px] text-slate-100">{row.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="text-[18px] font-semibold text-white mb-2">Géneros (muestra máx. 15)</Text>
            <View className="flex-row flex-wrap mb-5">
              {availableGenres.map((genre) => {
                const selected = selectedGenres.includes(genre);
                return (
                  <TouchableOpacity
                    key={genre}
                    className={`rounded-full px-3 py-1 mr-2 mb-2 border ${
                      selected ? 'bg-purple-600/30 border-purple-400' : 'bg-slate-800 border-slate-600'
                    }`}
                    onPress={() => toggleGenre(genre)}
                  >
                    <Text className={`text-sm ${selected ? 'text-purple-200 font-semibold' : 'text-slate-300'}`}>
                      {genre}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View className="p-4 border-t border-slate-700">
            <TouchableOpacity
              className="h-12 border border-slate-600 rounded-xl bg-slate-800 items-center justify-center"
              onPress={clearFilters}
            >
              <Text className="text-slate-100 text-base font-medium">Limpiar Filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
