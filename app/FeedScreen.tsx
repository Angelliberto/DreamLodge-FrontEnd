import { useRouter } from 'expo-router';
import { Book, Brain, Clock, Film, Filter, Gamepad2, Heart, MessageSquare, Music, Palette, Search, Star } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList, Image,
  Linking,
  StatusBar,
  Text, TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavigation } from '../src/components/BottomNavigation';
import { NavigationBar } from '../src/components/NavigationBar';
import { BackgroundLayout } from '../src/components/ui/BackgroundLayout';
import { globalSearch } from '../src/services/external_api/UnifiedService';
import { CulturalItem } from '../src/types/ObraItem';


export default function UnifiedFeedScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<CulturalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const performSearch = async (text: string = '') => {
    setLoading(true);
    const data = await globalSearch(text.trim()); 
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    performSearch(); 
  }, []);

  const getCategoryIcon = (cat: string) => {
    switch(cat) {
      case 'cine': return Film;
      case 'videojuegos': return Gamepad2;
      case 'literatura': return Book;
      case 'música': return Music;
      case 'arte-visual': return Palette;
      default: return Film;
    }
  };

  const getCategoryColor = (cat: string) => {
    switch(cat) {
      case 'cine': return '#3b82f6'; // Blue-500
      case 'videojuegos': return '#a855f7'; // Purple-500
      case 'literatura': return '#facc15'; // Yellow-400
      case 'música': return '#22c55e'; // Green-500
      case 'arte-visual': return '#f472b6'; // Pink-400
      default: return '#666';
    }
  };

  const handlePress = (item: CulturalItem) => {
      if (item.metadata.contextLink) {
          Linking.openURL(item.metadata.contextLink);
      } else {
          // Nota: El uso de 'alert()' debe ser reemplazado por un modal o UI personalizada.
          alert(`Detalles de: ${item.title}`);
      }
  };

  const renderItem = ({ item }: { item: CulturalItem }) => {
    const CategoryIcon = getCategoryIcon(item.category);
    const categoryColor = getCategoryColor(item.category);

    return (
    <TouchableOpacity 
        className="mb-4 mx-4"
      activeOpacity={0.9}
      onPress={() => handlePress(item)}
    >
      <View 
          className="bg-slate-800/90 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl shadow-black/40"
      >
          {/* Image Container */}
          <View className="relative">
        <Image 
          source={{ uri: item.imageUrl }} 
              style={{ width: '100%', height: 220 }} 
          resizeMode="cover" 
          className="bg-slate-700"
        />
        
            {/* Category Icon - Top Left */}
        <View 
              style={{ backgroundColor: categoryColor }}
              className="absolute top-3 left-3 w-10 h-10 rounded-full items-center justify-center shadow-lg"
        >
              <CategoryIcon size={20} color="white" />
        </View>

            {/* Action Icons - Top Right */}
            <View className="absolute top-3 right-3 flex-row gap-2">
              <TouchableOpacity 
                className="bg-black/60 w-9 h-9 rounded-full items-center justify-center"
                onPress={(e) => {
                  e.stopPropagation();
                  // Handle favorite
                }}
              >
                <Heart size={16} color="white" fill="none" />
              </TouchableOpacity>
              <TouchableOpacity 
                className="bg-black/60 w-9 h-9 rounded-full items-center justify-center"
                onPress={(e) => {
                  e.stopPropagation();
                  // Handle watchlist
                }}
              >
                <Clock size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <View className="p-4">
            {/* Title */}
            <Text numberOfLines={2} className="text-lg font-bold text-white mb-2 leading-tight">
            {item.title}
          </Text>
            
            {/* Creator and Year */}
            <View className="flex-row items-center mb-3">
              <Text numberOfLines={1} className="text-sm text-slate-300 flex-1">
            {item.creator}
          </Text>
              {item.year && (
                <>
                  <Text className="text-sm text-slate-500 mx-2">•</Text>
                  <Text className="text-sm text-slate-400">{item.year}</Text>
                </>
              )}
            </View>

            {/* Description */}
            {item.description && (
              <Text numberOfLines={3} className="text-sm text-slate-400 mb-3 leading-5">
                {item.description}
              </Text>
            )}

            {/* Tags/Genres */}
            {(item.metadata.genres && item.metadata.genres.length > 0) && (
              <View className="flex-row flex-wrap gap-2 mt-2">
                {item.metadata.genres.slice(0, 4).map((genre, idx) => (
                  <View 
                    key={idx}
                    className="bg-slate-700/60 px-3 py-1.5 rounded-full"
                  >
                    <Text className="text-xs text-slate-300 font-medium">
                      {genre}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Rating and Duration */}
            <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
              <View className="flex-row items-center gap-1">
                {item.rating !== undefined && (
                  <>
                    <Star size={14} color="#fbbf24" fill="#fbbf24" />
                    <Text className="text-sm text-slate-300 font-semibold">
                      {item.rating.toFixed(1)}
                    </Text>
                  </>
                )}
              </View>
              {item.metadata.duration && (
                <Text className="text-xs text-slate-500">
                  {item.metadata.duration}
                </Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
  };

  return (
    <BackgroundLayout> 
      <SafeAreaView className="flex-1">
        <StatusBar barStyle="light-content" />
        
        <NavigationBar variant="simple" showAuth={false} showLogout={false} />

        {/* Search Container */}
        <View className="px-4 pt-4 pb-3">
          <View className="flex-row gap-2 mb-2">
          <View className="flex-1 relative">
            <TextInput
                className="flex-1 h-12 rounded-xl border border-slate-700 bg-slate-800/90 pl-11 pr-4 text-base text-white"
                placeholder="Buscar por título, autor, descripción o etiquetas..."
                placeholderTextColor="#64748b" 
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => performSearch(query)}
              returnKeyType="search"
            />
            <View className="absolute left-3 top-3.5">
                <Search size={18} color="#64748b" />
            </View>
          </View>
          
          <TouchableOpacity 
              className="w-12 h-12 bg-slate-700/80 border border-slate-600 rounded-xl justify-center items-center" 
              onPress={() => {
                // Handle filters
              }}
          >
              <Filter size={20} color="#94a3b8" />
          </TouchableOpacity>
          </View>

          {/* Results Count */}
          {!loading && (
            <Text className="text-sm text-slate-400 mt-1">
              {items.length} {items.length === 1 ? 'obra encontrada' : 'obras encontradas'}
            </Text>
          )}
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#c084fc" /> 
            <Text className="mt-4 text-slate-400">Explorando el universo...</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="px-4 py-12 items-center">
                <Text className="text-center text-slate-500 text-lg mb-2">
                  Sin resultados
                </Text>
                <Text className="text-center text-slate-600 text-sm">
                  Intenta otra búsqueda
              </Text>
              </View>
            }
          />
        )}

        <BottomNavigation />
      </SafeAreaView>
    </BackgroundLayout>
  );
}