import { Search, X } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CulturalCategory, CulturalItem } from '@/types/CulturalItem';
import { BottomNavigation } from '../BottomNavigation';
import { NavigationBar } from '../NavigationBar';
import { BackgroundLayout } from '../ui/BackgroundLayout';
import { CategoryTab, FeedFilterChips } from './CategoryIconTabBar';
import { FEED_GRID_GAP, FEED_H_PAD } from './feedConstants';

type SearchFeedModalProps = {
  visible: boolean;
  onClose: () => void;
  query: string;
  onChangeQuery: (value: string) => void;
  onSubmitSearch: () => void;
  searchLoading: boolean;
  hasSearched: boolean;
  filteredSearchItems: CulturalItem[];
  hasActiveFilters: boolean;
  feedPosterHeight: number;
  renderItem: ({ item, index }: { item: CulturalItem; index: number }) => React.ReactElement;
  listExtraData?: unknown;
  filterCategories: CategoryTab[];
  selectedCategories: CulturalCategory[];
  toggleCategory: (category: CulturalCategory) => void;
};

export function SearchFeedModal({
  visible,
  onClose,
  query,
  onChangeQuery,
  onSubmitSearch,
  searchLoading,
  hasSearched,
  filteredSearchItems,
  hasActiveFilters,
  feedPosterHeight,
  renderItem,
  listExtraData,
  filterCategories,
  selectedCategories,
  toggleCategory,
}: SearchFeedModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <BackgroundLayout>
        <SafeAreaView className="flex-1">
          <NavigationBar variant="simple" showAuth={false} showLogout={false} />
          <View className="px-4 pt-3 pb-2">
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="h-12 w-12 items-center justify-center rounded-xl border border-slate-600 bg-slate-800/85"
                onPress={onClose}
              >
                <X size={20} color="#e2e8f0" />
              </TouchableOpacity>
              <View className="relative flex-1">
                <TextInput
                  className="h-12 flex-1 rounded-xl border border-slate-700 bg-slate-800/90 pl-11 pr-4 text-base text-white"
                  placeholder="Buscar por titulo, autor, descripcion o etiquetas..."
                  placeholderTextColor="#64748b"
                  value={query}
                  onChangeText={onChangeQuery}
                  onSubmitEditing={onSubmitSearch}
                  returnKeyType="search"
                />
                <View className="absolute left-3 top-3.5">
                  <Search size={18} color="#64748b" />
                </View>
              </View>
            </View>

            <FeedFilterChips
              filterCategories={filterCategories}
              selectedCategories={selectedCategories}
              toggleCategory={toggleCategory}
            />

            {!searchLoading && hasSearched && (
              <Text className="mt-2 text-sm text-slate-400">
                {filteredSearchItems.length}{' '}
                {filteredSearchItems.length === 1 ? 'obra encontrada' : 'obras encontradas'}
              </Text>
            )}
          </View>

          {searchLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#c084fc" />
              <Text className="mt-4 text-slate-400">Explorando...</Text>
            </View>
          ) : !hasSearched ? (
            <View className="flex-1 items-center justify-center px-8">
              <Search size={28} color="#64748b" />
              <Text className="mt-4 text-center text-base text-slate-400">
                Escribe para buscar contenido
              </Text>
              <Text className="mt-2 text-center text-sm text-slate-500">
                Escribe arriba y usa los iconos para acotar por tipo
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredSearchItems}
              extraData={listExtraData}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              getItemLayout={(_, index) => {
                const rowHeight = feedPosterHeight + 72 + FEED_GRID_GAP;
                const row = Math.floor(index / 2);
                return {
                  length: rowHeight,
                  offset: row * rowHeight,
                  index,
                };
              }}
              numColumns={2}
              columnWrapperStyle={{
                flexDirection: 'row',
                marginBottom: FEED_GRID_GAP,
                paddingHorizontal: FEED_H_PAD,
              }}
              contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={Platform.OS === 'android'}
              maxToRenderPerBatch={8}
              updateCellsBatchingPeriod={80}
              initialNumToRender={10}
              windowSize={7}
              style={{ flex: 1 }}
              ListEmptyComponent={
                <View className="items-center px-4 py-12">
                  <Text className="mb-2 text-center text-lg text-slate-500">Sin resultados</Text>
                  <Text className="text-center text-sm text-slate-600">
                    {hasActiveFilters
                      ? 'No hay resultados para los filtros seleccionados'
                      : 'Intenta otra busqueda'}
                  </Text>
                </View>
              }
            />
          )}
          <BottomNavigation />
        </SafeAreaView>
      </BackgroundLayout>
    </Modal>
  );
}
