import { Filter, Search, X } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CulturalItem } from '@/types/CulturalItem';
import { BottomNavigation } from '../BottomNavigation';
import { NavigationBar } from '../NavigationBar';
import { BackgroundLayout } from '../ui/BackgroundLayout';
import { FEED_GRID_GAP, FEED_H_PAD } from './feedConstants';

type SearchFeedModalProps = {
  visible: boolean;
  onClose: () => void;
  query: string;
  onChangeQuery: (value: string) => void;
  onSubmitSearch: () => void;
  onToggleFilters: () => void;
  searchLoading: boolean;
  hasSearched: boolean;
  filteredSearchItems: CulturalItem[];
  hasActiveFilters: boolean;
  feedPosterHeight: number;
  renderItem: ({ item, index }: { item: CulturalItem; index: number }) => React.ReactElement;
};

export function SearchFeedModal({
  visible,
  onClose,
  query,
  onChangeQuery,
  onSubmitSearch,
  onToggleFilters,
  searchLoading,
  hasSearched,
  filteredSearchItems,
  hasActiveFilters,
  feedPosterHeight,
  renderItem,
}: SearchFeedModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <BackgroundLayout>
        <SafeAreaView className="flex-1">
          <NavigationBar variant="simple" showAuth={false} showLogout={false} />
          <View className="px-4 pt-3 pb-3">
            <View className="flex-row gap-2 mb-2">
              <TouchableOpacity
                className="w-12 h-12 bg-slate-800/85 border border-slate-600 rounded-xl justify-center items-center"
                onPress={onClose}
              >
                <X size={20} color="#e2e8f0" />
              </TouchableOpacity>
              <View className="flex-1 relative">
                <TextInput
                  className="flex-1 h-12 rounded-xl border border-slate-700 bg-slate-800/90 pl-11 pr-4 text-base text-white"
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

              <TouchableOpacity
                className="w-12 h-12 bg-slate-700/80 border border-slate-600 rounded-xl justify-center items-center"
                onPress={onToggleFilters}
              >
                <Filter size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {!searchLoading && hasSearched && (
              <Text className="text-sm text-slate-400 mt-1">
                {filteredSearchItems.length}{' '}
                {filteredSearchItems.length === 1 ? 'obra encontrada' : 'obras encontradas'}
              </Text>
            )}
          </View>

          {searchLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#c084fc" />
              <Text className="mt-4 text-slate-400">Explorando el universo...</Text>
            </View>
          ) : !hasSearched ? (
            <View className="flex-1 justify-center items-center px-8">
              <Search size={28} color="#64748b" />
              <Text className="text-center text-slate-400 text-base mt-4">
                Escribe para buscar contenido
              </Text>
              <Text className="text-center text-slate-500 text-sm mt-2">
                Los filtros se aplican despues de realizar una busqueda.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredSearchItems}
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
              removeClippedSubviews={true}
              maxToRenderPerBatch={8}
              updateCellsBatchingPeriod={80}
              initialNumToRender={10}
              windowSize={7}
              legacyImplementation={false}
              disableVirtualization={false}
              ListEmptyComponent={
                <View className="px-4 py-12 items-center">
                  <Text className="text-center text-slate-500 text-lg mb-2">Sin resultados</Text>
                  <Text className="text-center text-slate-600 text-sm">
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
