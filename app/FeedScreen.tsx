import { useRouter } from 'expo-router';
import { Book, Clock, Film, Filter, Gamepad2, Heart, Music, Palette, Search, Star } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StatusBar,
  Text, TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavigation } from '../src/components/BottomNavigation';
import { NavigationBar } from '../src/components/NavigationBar';
import { BackgroundLayout } from '../src/components/ui/BackgroundLayout';
import { OptimizedImage } from '../src/components/ui/OptimizedImage';
import { useAuth } from '../src/contexts/AuthContext';
import { addToFavorites, addToPending, getFavorites, getPending, removeFromFavorites, removeFromPending } from '../src/services/DL_api/api';
import { globalSearch } from '../src/services/external_api/UnifiedService';
import { CulturalItem } from '../src/types/CulturalItem';


export default function UnifiedFeedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<CulturalItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Map: id -> { mongoId?: string } to save MongoDB IDs and avoid searches
  const [favoriteIds, setFavoriteIds] = useState<Map<string, { mongoId?: string }>>(new Map());
  const [pendingIds, setPendingIds] = useState<Map<string, { mongoId?: string }>>(new Map());
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  
  // Refs for debounce and abort controllers
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const loadingArtworksRef = useRef(false); // Prevent duplicate calls

  const performSearch = useCallback(async (text: string = '', signal?: AbortSignal) => {
    setLoading(true);
    try {
      const data = await globalSearch(text.trim()); 
      // Only update if component is still mounted and wasn't cancelled
      if (!signal?.aborted) {
        // Limit array size to avoid indefinite growth
        // Keep only the first 200 items for better performance
        const limitedData = data.slice(0, 200);
        setItems(limitedData);
        setLoading(false);
      }
    } catch (error) {
      if (!signal?.aborted) {
        setLoading(false);
        console.error('Error performing search:', error);
      }
    }
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback((text: string) => {
    // Cancel previous search if it exists
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Create new abort controller
    searchAbortControllerRef.current = new AbortController();
    
    // Set up new timer for debounce (500ms)
    debounceTimerRef.current = setTimeout(() => {
      performSearch(text, searchAbortControllerRef.current?.signal);
    }, 500);
  }, [performSearch]);

  useEffect(() => {
    const abortController = new AbortController();
    searchAbortControllerRef.current = abortController;
    performSearch('', abortController.signal);
    
    // Cleanup: cancel search if component unmounts
    return () => {
      abortController.abort();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [performSearch]);
  
  // Effect for debounced search when query changes (only if there's text)
  useEffect(() => {
    // Only debounce if there's text in search (not on initial load)
    if (query && query.trim().length > 0) {
      debouncedSearch(query);
    }
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, debouncedSearch]);

  // Load favorites and pending when user is authenticated
  useEffect(() => {
    let isMounted = true;
    
    // Prevent duplicate calls
    if (loadingArtworksRef.current) return;
    
    const loadUserArtworks = async () => {
      if (!user?._id || loadingArtworksRef.current) return;
      
      loadingArtworksRef.current = true;

      try {
        // getFavorites and getPending functions already have internal cache
        // Will only make request if there's no valid cache
        const [favorites, pending] = await Promise.all([
          getFavorites(),
          getPending()
        ]);

        // Only update if component is still mounted
        if (!isMounted) {
          loadingArtworksRef.current = false;
          return;
        }

        // Create Maps with IDs and MongoDB IDs of favorites and pending
        const favoritesMap = new Map<string, { mongoId?: string }>();
        favorites.forEach((fav: CulturalItem) => {
          favoritesMap.set(fav.id, { mongoId: fav._id?.toString() });
        });
        setFavoriteIds(favoritesMap);

        const pendingMap = new Map<string, { mongoId?: string }>();
        pending.forEach((pend: CulturalItem) => {
          pendingMap.set(pend.id, { mongoId: pend._id?.toString() });
        });
        setPendingIds(pendingMap);
      } catch (error) {
        if (isMounted) {
          console.error('Error loading user artworks:', error);
        }
      } finally {
        loadingArtworksRef.current = false;
      }
    };

    loadUserArtworks();
    
    // Cleanup: mark as unmounted and clear states to avoid memory leaks
    return () => {
      isMounted = false;
      loadingArtworksRef.current = false;
      // Clear Maps to avoid memory accumulation
      setFavoriteIds(new Map());
      setPendingIds(new Map());
      setUpdatingItems(new Set());
    };
  }, [user?._id]);

  // Memoize category functions to avoid recreating them on every render
  const getCategoryIcon = useCallback((cat: string) => {
    switch(cat) {
      case 'cine': return Film;
      case 'videojuegos': return Gamepad2;
      case 'literatura': return Book;
      case 'musica': return Music;
      case 'arte-visual': return Palette;
      default: return Film;
    }
  }, []);

  const getCategoryColor = useCallback((cat: string) => {
    switch(cat) {
      case 'cine': return '#3b82f6'; // Blue-500
      case 'videojuegos': return '#a855f7'; // Purple-500
      case 'literatura': return '#facc15'; // Yellow-400
      case 'musica': return '#22c55e'; // Green-500
      case 'arte-visual': return '#f472b6'; // Pink-400
      default: return '#666';
    }
  }, []);

  const handlePress = useCallback((item: CulturalItem) => {
      // Navigate to details page passing all item information
      router.push({
          pathname: '/artwork-details',
          params: { 
            id: item.id,
            source: item.source,
            originalId: String(item.originalId),
            // Pass basic data as JSON string to avoid serialization issues
            itemData: JSON.stringify(item)
          }
      });
  }, [router]);

  const handleToggleFavorite = useCallback(async (item: CulturalItem, e: any) => {
    e.stopPropagation();
    
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para agregar favoritos');
      return;
    }

    const itemId = item.id;
    const favoriteData = favoriteIds.get(itemId);
    const isFavorite = !!favoriteData;
    const updatingKey = `fav-${itemId}`;

    // Avoid multiple clicks
    if (updatingItems.has(updatingKey)) return;

    setUpdatingItems(prev => new Set(prev).add(updatingKey));

    try {
      if (isFavorite) {
        // Remove from favorites - use mongoId saved in local state
        const mongoId = favoriteData?.mongoId;
        if (mongoId) {
          await removeFromFavorites(mongoId);
        } else {
          // Fallback: if we don't have mongoId, search (only in exceptional cases)
          const favorites = await getFavorites();
          const favItem = favorites.find((fav: CulturalItem) => fav.id === itemId);
          if (favItem?._id) {
            await removeFromFavorites(favItem._id.toString());
          }
        }
        setFavoriteIds(prev => {
          const newMap = new Map(prev);
          newMap.delete(itemId);
          return newMap;
        });
      } else {
        // Add to favorites - first remove from pending if it's there
        const pendingData = pendingIds.get(itemId);
        if (pendingData?.mongoId) {
          try {
            await removeFromPending(pendingData.mongoId);
            setPendingIds(prev => {
              const newMap = new Map(prev);
              newMap.delete(itemId);
              return newMap;
            });
          } catch (error) {
            console.error('Error removing from pending:', error);
          }
        }

        const artworkData: CulturalItem = {
          id: item.id,
          originalId: item.originalId,
          source: item.source,
          title: item.title,
          category: item.category,
          imageUrl: item.imageUrl,
          creator: item.creator,
          year: item.year,
          description: item.description,
          rating: item.rating,
          metadata: item.metadata || {}
        };
        const result = await addToFavorites(artworkData);
        // Save mongoId returned by backend
        const mongoId = result.data?.artworkId;
        setFavoriteIds(prev => {
          const newMap = new Map(prev);
          newMap.set(itemId, { mongoId });
          return newMap;
        });
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', error.response?.data?.message || 'No se pudo actualizar el favorito');
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(updatingKey);
        return newSet;
      });
    }
  }, [user, favoriteIds, pendingIds, updatingItems]);

  const handleTogglePending = useCallback(async (item: CulturalItem, e: any) => {
    e.stopPropagation();
    
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para agregar a pendientes');
      return;
    }

    const itemId = item.id;
    const pendingData = pendingIds.get(itemId);
    const isPending = !!pendingData;
    const updatingKey = `pend-${itemId}`;

    // Avoid multiple clicks
    if (updatingItems.has(updatingKey)) return;

    setUpdatingItems(prev => new Set(prev).add(updatingKey));

    try {
      if (isPending) {
        // Remove from pending - use mongoId saved in local state
        const mongoId = pendingData?.mongoId;
        if (mongoId) {
          await removeFromPending(mongoId);
        } else {
          // Fallback: if we don't have mongoId, search (only in exceptional cases)
          const pending = await getPending();
          const pendItem = pending.find((pend: CulturalItem) => pend.id === itemId);
          if (pendItem?._id) {
            await removeFromPending(pendItem._id.toString());
          }
        }
        setPendingIds(prev => {
          const newMap = new Map(prev);
          newMap.delete(itemId);
          return newMap;
        });
      } else {
        // Add to pending - first remove from favorites if it's there
        const favoriteData = favoriteIds.get(itemId);
        if (favoriteData?.mongoId) {
          try {
            await removeFromFavorites(favoriteData.mongoId);
            setFavoriteIds(prev => {
              const newMap = new Map(prev);
              newMap.delete(itemId);
              return newMap;
            });
          } catch (error) {
            console.error('Error removing from favorites:', error);
          }
        }

        const artworkData: CulturalItem = {
          id: item.id,
          originalId: item.originalId,
          source: item.source,
          title: item.title,
          category: item.category,
          imageUrl: item.imageUrl,
          creator: item.creator,
          year: item.year,
          description: item.description,
          rating: item.rating,
          metadata: item.metadata || {}
        };
        const result = await addToPending(artworkData);
        // Save mongoId returned by backend
        const mongoId = result.data?.artworkId;
        setPendingIds(prev => {
          const newMap = new Map(prev);
          newMap.set(itemId, { mongoId });
          return newMap;
        });
      }
    } catch (error: any) {
      console.error('Error toggling pending:', error);
      Alert.alert('Error', error.response?.data?.message || 'No se pudo actualizar la lista de pendientes');
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(updatingKey);
        return newSet;
      });
    }
  }, [user, favoriteIds, pendingIds, updatingItems]);

  // Memoize renderItem to avoid unnecessary re-renders
  const renderItem = useCallback(({ item }: { item: CulturalItem }) => {
    const CategoryIcon = getCategoryIcon(item.category);
    const categoryColor = getCategoryColor(item.category);
    const isFavorite = favoriteIds.has(item.id);
    const isPending = pendingIds.has(item.id);
    const isUpdatingFavorite = updatingItems.has(`fav-${item.id}`);
    const isUpdatingPending = updatingItems.has(`pend-${item.id}`);

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
        <OptimizedImage 
          source={{ uri: item.imageUrl }} 
              style={{ width: '100%', height: 220 }} 
          resizeMode="cover" 
          className="bg-slate-700"
          placeholderColor="#1e293b"
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
                onPress={(e) => handleToggleFavorite(item, e)}
                disabled={isUpdatingFavorite}
              >
                <Heart 
                  size={16} 
                  color={isFavorite ? "#ef4444" : "white"} 
                  fill={isFavorite ? "#ef4444" : "none"} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                className="bg-black/60 w-9 h-9 rounded-full items-center justify-center"
                onPress={(e) => handleTogglePending(item, e)}
                disabled={isUpdatingPending}
              >
                <Clock 
                  size={16} 
                  color={isPending ? "#fbbf24" : "white"} 
                  fill={isPending ? "#fbbf24" : "none"} 
                />
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
  }, [getCategoryIcon, getCategoryColor, favoriteIds, pendingIds, updatingItems, handlePress, handleToggleFavorite, handleTogglePending]);

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
              onSubmitEditing={() => {
                if (debounceTimerRef.current) {
                  clearTimeout(debounceTimerRef.current);
                }
                performSearch(query);
              }}
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
            // Aggressive performance optimizations (Instagram style)
            removeClippedSubviews={true}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={100}
            initialNumToRender={8}
            windowSize={5}
            // Additional optimizations
            legacyImplementation={false}
            disableVirtualization={false}
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