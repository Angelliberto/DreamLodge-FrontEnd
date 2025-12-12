import { Search } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList, Image,
  Linking,
  SafeAreaView, StatusBar,
  Text, TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { BackgroundLayout } from '../src/components/ui/BackgroundLayout';
import { globalSearch } from '../src/services/external_api/UnifiedService';
import { CulturalItem } from '../src/types/ObraItem';

const { width } = Dimensions.get('window');
const COLUMN_NUM = 2;
const ITEM_WIDTH = (width / COLUMN_NUM) - 20; 

export default function UnifiedFeedScreen() {
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

  const renderItem = ({ item }: { item: CulturalItem }) => (
    <TouchableOpacity 
      className="w-1/2 p-2"
      activeOpacity={0.9}
      onPress={() => handlePress(item)}
    >
      <View 
        style={{ width: '100%' }}
        className="bg-slate-800 border border-slate-700/50 rounded-xl overflow-hidden shadow-lg shadow-black/30"
      >
        <Image 
          source={{ uri: item.imageUrl }} 
          style={{ width: '100%', height: ITEM_WIDTH * 1.4 }} 
          resizeMode="cover" 
          className="bg-slate-700"
        />
        
        {/* Badge Categoría */}
        <View 
          style={{ backgroundColor: getCategoryColor(item.category) }}
          className="absolute top-3 left-3 px-2 py-1 rounded-full shadow-sm"
        >
          <Text className="text-white text-[10px] font-bold uppercase">{item.category.charAt(0)}</Text>
        </View>

        {/* Rating */}
        {item.rating !== undefined && (
          <View className="absolute top-3 right-3 bg-black/50 p-1.5 rounded-full flex-row items-center gap-1">
            <Text className="text-yellow-400 text-xs font-bold">★</Text>
            <Text className="text-white text-xs font-bold">{item.rating.toFixed(1)}</Text>
          </View>
        )}

        <View className="p-3">
          <Text numberOfLines={2} className="text-base font-bold text-white mb-1 leading-tight">
            {item.title}
          </Text>
          <Text numberOfLines={1} className="text-xs text-slate-400 mb-3">
            {item.creator}
          </Text>
          
          <View className="flex-row items-center">
            {item.year && <Text className="text-xs text-slate-500 font-medium">{item.year}</Text>}
            {item.metadata.duration && (
              <>
                <Text className="text-xs text-slate-600 mx-2">•</Text>
                <Text className="text-xs text-slate-500 font-medium">{item.metadata.duration}</Text>
              </>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <BackgroundLayout> 
      <SafeAreaView className="flex-1">
        <StatusBar barStyle="light-content" />
        
        {/* Header */}
        <View className="px-6 pt-6 pb-2">
          <Text className="text-3xl font-extrabold text-white">Feed Cultural</Text>
          <Text className="text-sm text-slate-400 mt-1">Descubre lo que resuena contigo</Text>
        </View>

        {/* Search Container */}
        <View className="flex-row px-6 mb-4 gap-3">
          <View className="flex-1 relative">
            <TextInput
              className="flex-1 h-12 rounded-xl border border-slate-700 bg-slate-800/80 pl-10 pr-4 text-base text-white focus:border-purple-500 transition-colors duration-200"
              placeholder="Busca 'Zelda', 'Beatles', 'Matrix'..."
              placeholderTextColor="#94a3b8" 
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => performSearch(query)}
              returnKeyType="search"
            />
            <View className="absolute left-3 top-3.5">
                <Search size={18} color="#94a3b8" />
            </View>
          </View>
          
          <TouchableOpacity 
            className="w-12 h-12 bg-purple-600 rounded-xl justify-center items-center shadow-md shadow-purple-900 active:opacity-80" 
            onPress={() => performSearch(query)}
          >
            <Search size={20} color="white" />
          </TouchableOpacity>
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
            numColumns={COLUMN_NUM}
            contentContainerClassName="p-4" 
            ListEmptyComponent={
              <Text className="text-center mt-12 text-slate-500 text-lg">
                Sin resultados. Intenta otra búsqueda.
              </Text>
            }
          />
        )}
      </SafeAreaView>
    </BackgroundLayout>
  );
}