// src/components/chat/ContextTab.tsx

import { X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { getFavorites, getPending } from '../../services/DL_api/api';
import { CulturalItem } from '../../types/CulturalItem';
import { OptimizedImage } from '../ui/OptimizedImage';

interface ContextTabProps {
  selectedItems: CulturalItem[];
  onItemSelect: (item: CulturalItem) => void;
  onItemRemove: (itemId: string) => void;
}

export function ContextTab({ selectedItems, onItemSelect, onItemRemove }: ContextTabProps) {
  const [favorites, setFavorites] = useState<CulturalItem[]>([]);
  const [pending, setPending] = useState<CulturalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'favorites' | 'pending'>('favorites');

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const [favs, pend] = await Promise.all([
        getFavorites(),
        getPending()
      ]);
      setFavorites(favs);
      setPending(pend);
    } catch (error) {
      console.error('Error loading context items:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedIds = new Set(selectedItems.map(item => item.id));
  const itemsToShow = activeTab === 'favorites' ? favorites : pending;
  const filteredItems = itemsToShow.filter(item => !selectedIds.has(item.id));

  return (
    <View className="flex-1 bg-slate-900">
      {/* Tab Selector */}
      <View className="flex-row border-b border-slate-800">
        <TouchableOpacity
          onPress={() => setActiveTab('favorites')}
          className={`flex-1 py-3 items-center ${activeTab === 'favorites' ? 'border-b-2 border-purple-500' : ''}`}
        >
          <Text className={`font-semibold ${activeTab === 'favorites' ? 'text-purple-400' : 'text-slate-400'}`}>
            Favoritos ({favorites.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('pending')}
          className={`flex-1 py-3 items-center ${activeTab === 'pending' ? 'border-b-2 border-purple-500' : ''}`}
        >
          <Text className={`font-semibold ${activeTab === 'pending' ? 'text-purple-400' : 'text-slate-400'}`}>
            Pendientes ({pending.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Selected Items */}
      {selectedItems.length > 0 && (
        <View className="border-b border-slate-800 bg-slate-800/30 p-3">
          <Text className="text-slate-400 text-xs mb-2 font-semibold">
            Elementos en contexto ({selectedItems.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {selectedItems.map((item) => (
                <View
                  key={item.id}
                  className="bg-slate-700/50 rounded-lg p-2 flex-row items-center gap-2"
                >
                  <OptimizedImage
                    source={{ uri: item.imageUrl }}
                    style={{ width: 40, height: 40, borderRadius: 8 }}
                    resizeMode="cover"
                  />
                  <View className="flex-1 max-w-[120px]">
                    <Text className="text-white text-xs font-medium" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text className="text-slate-400 text-xs" numberOfLines={1}>
                      {item.creator}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => onItemRemove(item.id)}
                    className="ml-1"
                  >
                    <X size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Items List */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 12 }}>
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#c084fc" />
            <Text className="text-slate-400 mt-4">Cargando...</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-slate-400 text-center">
              {activeTab === 'favorites'
                ? 'No tienes favoritos aún'
                : 'No tienes elementos pendientes'}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {filteredItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => onItemSelect(item)}
                className="bg-slate-800/50 rounded-xl p-3 flex-row gap-3 border border-slate-700/50"
              >
                <OptimizedImage
                  source={{ uri: item.imageUrl }}
                  style={{ width: 64, height: 64, borderRadius: 8 }}
                  resizeMode="cover"
                />
                <View className="flex-1">
                  <Text className="text-white font-semibold text-sm mb-1" numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text className="text-slate-400 text-xs mb-1" numberOfLines={1}>
                    {item.creator}
                  </Text>
                  {item.year && (
                    <Text className="text-slate-500 text-xs">{item.year}</Text>
                  )}
                  {item.metadata?.genres && item.metadata.genres.length > 0 && (
                    <View className="flex-row flex-wrap gap-1 mt-1">
                      {item.metadata.genres.slice(0, 2).map((genre, idx) => (
                        <View
                          key={idx}
                          className="bg-purple-500/20 px-2 py-0.5 rounded"
                        >
                          <Text className="text-purple-300 text-xs">{genre}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
