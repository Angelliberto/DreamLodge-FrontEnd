import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { ProfileHeader } from '@/components/ProfileHeader';
import { Brain, EyeOff, Film, Heart, Sparkles } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavigation } from '../src/components/BottomNavigation';
import { NavigationBar } from '../src/components/NavigationBar';
import { BackgroundLayout } from '../src/components/ui/BackgroundLayout';
import { CulturalGridItem } from '../src/components/cultural/CulturalGridItem';
import { DIMENSION_NAMES } from '../src/constants/oceanTestCopy';
import {
  OCEAN_SCORE_METRIC,
  affineStored05ToLikertMean,
  likertMeanToBarPercent,
  type OceanScoreMetric,
} from '../src/utils/oceanScoring';
import { useAuth } from '../src/contexts/AuthContext';
import {
  getFavorites,
  getNotInterested,
  getPending,
  getUserTestResults,
  invalidateUserArtworkListCaches,
} from '@/api/client';
import { CulturalItem } from '@/types/CulturalItem';

type ProfileTab = 'favorites' | 'pending' | 'notInterested';
type SortMode = 'recent' | 'type' | 'author' | 'title';
type SortDirection = 'desc' | 'asc';
const LOAD_BATCH_SIZE = 9;

function getItemTime(item: CulturalItem): number {
  const anyItem = item as any;
  const raw = anyItem?.createdAt || anyItem?.updatedAt || '';
  if (raw) {
    const t = new Date(raw).getTime();
    if (Number.isFinite(t)) return t;
  }
  return 0;
}



export default function UserProfileScreen() {
  const router = useRouter();
  const { user, hasTestResults } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('favorites');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [visibleByTab, setVisibleByTab] = useState<Record<ProfileTab, number>>({
    favorites: LOAD_BATCH_SIZE,
    pending: LOAD_BATCH_SIZE,
    notInterested: LOAD_BATCH_SIZE,
  });
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<any>(null);
  const [profile, setProfile] = useState<{ profile: string; description: string } | null>(null);
  const [favorites, setFavorites] = useState<CulturalItem[]>([]);
  const [pending, setPending] = useState<CulturalItem[]>([]);
  const [notInterested, setNotInterested] = useState<CulturalItem[]>([]);
  const [loadingArtworks, setLoadingArtworks] = useState(false);
  const loadingArtworksRef = useRef(false); // Prevent duplicate calls
  const initialDataLoadedRef = useRef(false); // Track if initial data has been loaded
  
  // Memoize dimension calculation to avoid recalculating on every render
  const { itemWidth, gap } = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    const padding = 16 * 2; // px-4 = 16px on each side
    const gap = 8;
    const itemWidth = (screenWidth - padding - (gap * 2)) / 3;
    return { itemWidth, gap };
  }, []);

  const loadingUserDataRef = useRef(false);
  
  useEffect(() => {
    // Prevent duplicate calls
    if (loadingUserDataRef.current) return;
    
    const loadUserData = async () => {
      if (!user?._id) {
        setLoading(false);
        return;
      }

      if (loadingUserDataRef.current) return;
      loadingUserDataRef.current = true;

      try {
        // Load test results
        if (hasTestResults) {
          const results = await getUserTestResults(user._id);
          if (results && Array.isArray(results) && results.length > 0) {
            const latestResult = results[0];
            let dimensions: Record<string, number> = {};
            const scoreMetric: OceanScoreMetric =
              latestResult.scoreMetric === OCEAN_SCORE_METRIC.IPIP_MEAN_1_5
                ? OCEAN_SCORE_METRIC.IPIP_MEAN_1_5
                : OCEAN_SCORE_METRIC.DISPLAY_AFFINE_05;

            if (
              latestResult.dimensions &&
              typeof latestResult.dimensions === 'object' &&
              Object.keys(latestResult.dimensions).length > 0
            ) {
              dimensions = { ...latestResult.dimensions };
            } else if (latestResult.scores) {
              Object.keys(latestResult.scores).forEach((dimension) => {
                const scoreObj = latestResult.scores[dimension];
                if (scoreObj && typeof scoreObj.total === 'number') {
                  const t = scoreObj.total;
                  dimensions[dimension] =
                    scoreMetric === OCEAN_SCORE_METRIC.IPIP_MEAN_1_5
                      ? t
                      : affineStored05ToLikertMean(t);
                }
              });
            }

            setTestResults({ dimensions });
            const profileName = typeof latestResult?.profile === 'string' ? latestResult.profile : '';
            const profileDescription =
              typeof latestResult?.description === 'string' ? latestResult.description : '';
            setProfile(
              profileName || profileDescription
                ? { profile: profileName || 'Análisis de personalidad', description: profileDescription || '' }
                : null
            );

          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
        loadingUserDataRef.current = false;
      }
    };

    loadUserData();
    
    return () => {
      loadingUserDataRef.current = false;
    };
  }, [user?._id, hasTestResults]);


  // Load both favorites and pending on initial mount to get accurate counts
  useEffect(() => {
    let isMounted = true;
    
    const loadInitialData = async () => {
      if (!user?._id) return;
      
      // Prevent duplicate calls
      if (loadingArtworksRef.current) return;
      
      loadingArtworksRef.current = true;
      setLoadingArtworks(true);
      
      try {
        // Load all lists in parallel to get accurate counts from the start
        const [favs, pend, notInt] = await Promise.all([
          getFavorites(),
          getPending(),
          getNotInterested()
        ]);
        
        // Only update if component is still mounted
        if (isMounted) {
          setFavorites(favs);
          setPending(pend);
          setNotInterested(notInt);
          initialDataLoadedRef.current = true;
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error loading artworks:', error);
        }
      } finally {
        if (isMounted) {
          setLoadingArtworks(false);
        }
        loadingArtworksRef.current = false;
      }
    };

    loadInitialData();
    
    // Cleanup: mark as unmounted
    return () => {
      isMounted = false;
      loadingArtworksRef.current = false;
    };
  }, [user?._id]);

  useFocusEffect(
    useCallback(() => {
      if (!user?._id) return undefined;
      let cancelled = false;
      const refresh = async () => {
        invalidateUserArtworkListCaches();
        try {
          const [favs, pend, notInt] = await Promise.all([
            getFavorites(),
            getPending(),
            getNotInterested(),
          ]);
          if (!cancelled) {
            setFavorites(favs);
            setPending(pend);
            setNotInterested(notInt);
            initialDataLoadedRef.current = true;
          }
        } catch (error) {
          if (!cancelled) console.error('Error refreshing profile lists on focus:', error);
        }
      };
      refresh();
      return () => {
        cancelled = true;
      };
    }, [user?._id])
  );

  // Silently refresh data when tab changes (uses cache, so it's instant and smooth)
  useEffect(() => {
    let isMounted = true;
    
    const refreshTabData = async () => {
      if (!user?._id) return;
      
      // Skip refresh on initial mount (handled by loadInitialData)
      if (!initialDataLoadedRef.current) {
        return;
      }
      
      try {
        if (activeTab === 'favorites') {
          // Refresh favorites silently (uses cache, so it's fast)
          const favs = await getFavorites();
          if (isMounted) {
            setFavorites(favs);
          }
        } else if (activeTab === 'pending') {
          // Refresh pending silently (uses cache, so it's fast)
          const pend = await getPending();
          if (isMounted) {
            setPending(pend);
          }
        } else {
          const notInt = await getNotInterested();
          if (isMounted) {
            setNotInterested(notInt);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error(`Error refreshing ${activeTab}:`, error);
        }
      }
    };

    refreshTabData();
    
    return () => {
      isMounted = false;
    };
  }, [activeTab, user?._id]);

  useEffect(() => {
    setVisibleByTab((prev) => ({
      ...prev,
      [activeTab]: LOAD_BATCH_SIZE,
    }));
  }, [activeTab, sortMode]);

  // Memoize counters to avoid recalculations
  const favoritesCount = useMemo(() => favorites.length, [favorites.length]);
  const pendingCount = useMemo(() => pending.length, [pending.length]);
  const notInterestedCount = useMemo(() => notInterested.length, [notInterested.length]);
  const totalTrackedWorks = useMemo(
    () => favoritesCount + pendingCount + notInterestedCount,
    [favoritesCount, pendingCount, notInterestedCount]
  );
  const favoriteGenreStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of favorites) {
      const genres = Array.isArray(item?.metadata?.genres) ? item.metadata.genres : [];
      for (const rawGenre of genres) {
        const genre = String(rawGenre || '').trim();
        if (!genre) continue;
        counts.set(genre, (counts.get(genre) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [favorites]);
  const favoriteMediaStats = useMemo(() => {
    const labels: Record<string, string> = {
      cine: 'Cine/Series',
      musica: 'Música',
      literatura: 'Literatura',
      'arte-visual': 'Arte visual',
      videojuegos: 'Videojuegos',
    };
    const counts = new Map<string, number>();
    for (const item of favorites) {
      const key = String(item?.category || '').trim().toLowerCase();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, label: labels[key] || key, count }));
  }, [favorites]);
  const sortedFavorites = useMemo(
    () => sortItems(favorites, sortMode, sortDirection),
    [favorites, sortMode, sortDirection]
  );
  const sortedPending = useMemo(
    () => sortItems(pending, sortMode, sortDirection),
    [pending, sortMode, sortDirection]
  );
  const sortedNotInterested = useMemo(
    () => sortItems(notInterested, sortMode, sortDirection),
    [notInterested, sortMode, sortDirection]
  );
  const currentItems = useMemo(() => {
    if (activeTab === 'favorites') return sortedFavorites;
    if (activeTab === 'pending') return sortedPending;
    return sortedNotInterested;
  }, [activeTab, sortedFavorites, sortedPending, sortedNotInterested]);
  const visibleCount = visibleByTab[activeTab] || LOAD_BATCH_SIZE;
  const visibleItems = currentItems.slice(0, visibleCount);
  const canLoadMore = visibleCount < currentItems.length;
  const currentCount = currentItems.length;
  const emptyState = useMemo(() => {
    if (activeTab === 'favorites') {
      return {
        icon: Heart,
        title: 'No tienes favoritos aún',
        subtitle: 'Explora y guarda tus obras favoritas',
      };
    }
    if (activeTab === 'pending') {
      return {
        icon: Film,
        title: 'No tienes pendientes',
        subtitle: 'Marca obras que quieres ver después',
      };
    }
    return {
      icon: EyeOff,
      title: 'No tienes obras marcadas',
      subtitle: 'Aquí verás lo que marcaste como no me interesa',
    };
  }, [activeTab]);

  const loadMoreForActiveTab = useCallback(() => {
    setVisibleByTab((prev) => ({
      ...prev,
      [activeTab]: Math.min((prev[activeTab] || LOAD_BATCH_SIZE) + LOAD_BATCH_SIZE, currentItems.length),
    }));
  }, [activeTab, currentItems.length]);
  const tabOptions: Array<{
    key: ProfileTab;
    label: string;
    count: number;
  }> = [
    {
      key: 'favorites',
      label: 'Favoritos',
      count: favoritesCount,
    },
    {
      key: 'pending',
      label: 'Pendientes',
      count: pendingCount,
    },
    {
      key: 'notInterested',
      label: 'Ocultos',
      count: notInterestedCount,
    },
  ];

  const sortOptions: Array<{
    key: SortMode;
    label: string;
  }> = [
    {
      key: 'recent',
      label: 'Fecha',
    },
    {
      key: 'type',
      label: 'Tipo',
    },
    {
      key: 'author',
      label: 'Autor',
    },
    {
      key: 'title',
      label: 'Título',
    },
  ];

const activeSortLabel =
  sortOptions.find((option) => option.key === sortMode)?.label || 'Fecha';
  // Memoize handlePress to avoid recreating the function
  const handlePress = useCallback((item: CulturalItem) => {
    const itemData = JSON.stringify(item);
    router.push({
      pathname: '/artwork-details',
      params: {
        id: item.id,
        source: item.source,
        originalId: String(item.originalId),
        itemData
      }
    });
  }, [router]);

  if (loading) {
    return (
      <BackgroundLayout>
        <SafeAreaView className="flex-1">
          <StatusBar barStyle="light-content" />
          <NavigationBar variant="simple" />
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#c084fc" />
          </View>
        </SafeAreaView>
      </BackgroundLayout>
    );
  }

  return (
    <BackgroundLayout>
      <SafeAreaView className="flex-1">
        <StatusBar barStyle="light-content" />
        <NavigationBar variant="simple" />

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Account Info Section */}
          <ProfileHeader
  name={user?.name || 'Usuario'}
  email={user?.email || 'usuario@gmail.com'}
  onPressSettings={() => router.push('/settings')}
/>

          {/* Artistic Profile Section */}
          {profile && testResults && (
            <View className="px-4 pt-2 pb-4">
              <Text className="text-white font-bold text-lg mb-3">Tu análisis de personalidad</Text>
              
              <View className="flex-row gap-2 mb-3">
                {/* Style Card */}
                <View className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
                  <View className="flex-row items-center gap-2 mb-2">
                    <LinearGradient
                      colors={['#a855f7', '#ec4899']}
                      className="w-6 h-6 rounded-lg items-center justify-center"
                    >
                      <Sparkles size={12} color="white" />
                    </LinearGradient>
                    <Text className="text-white font-semibold text-xs">Estilo</Text>
                  </View>
                  <Text className="text-purple-300 font-bold text-sm mb-1">{profile.profile}</Text>
                  <Text className="text-slate-400 text-[10px] leading-tight">{profile.description}</Text>
                </View>

                {/* OCEAN Results Link */}
                <TouchableOpacity 
                  onPress={() => router.push('/test_results')}
                  className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 items-center justify-center"
                >
                  <Brain size={20} color="#c084fc" />
                  <Text className="text-purple-300 font-semibold text-xs mt-2 text-center">Resultados</Text>
                  <Text className="text-slate-400 text-[10px] mt-1 text-center">OCEAN</Text>
                </TouchableOpacity>
              </View>

              {/* OCEAN Bars (Mini Version) */}
              <View className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3">
                {Object.entries(testResults.dimensions || {}).slice(0, 3).map(([key, value]) => {
                  const dim = DIMENSION_NAMES[key];
                  if (!dim) return null;
                  const score = typeof value === 'number' ? value : 0;
                  const percentage = likertMeanToBarPercent(score);
                  
                  return (
                    <View key={key} className="mb-2">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="text-slate-300 text-xs">{dim.es}</Text>
                        <Text className="text-white font-semibold text-xs">{score.toFixed(1)}</Text>
                      </View>
                      <View className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <View 
                          className="h-full rounded-full"
                          style={{ 
                            width: `${percentage}%`, 
                            backgroundColor: dim.color 
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
                <TouchableOpacity 
                  onPress={() => router.push('/test_results')}
                  className="mt-2 pt-2 border-t border-slate-700/50"
                >
                  <Text className="text-purple-300 text-xs text-center font-medium">Ver Resultados Completos</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Tabs */}
          {/* Library Tabs */}
          <View className="px-4 pt-2 pb-3">
            <View className="border-b border-slate-700/60">
              <View className="flex-row">
                {tabOptions.map((tab) => {
                  const isActive = activeTab === tab.key;

                  return (
                    <TouchableOpacity
                      key={tab.key}
                      activeOpacity={0.8}
                      onPress={() => setActiveTab(tab.key)}
                      className="flex-1 items-center pb-3"
                    >
                      <Text
                        className={`text-base font-bold ${
                          isActive ? 'text-white' : 'text-slate-500'
                        }`}
                        numberOfLines={1}
                      >
                        {tab.label}
                      </Text>

                      <Text
                        className={`mt-1 text-xs ${
                          isActive ? 'text-purple-300' : 'text-slate-600'
                        }`}
                      >
                        {tab.count}
                      </Text>

                      <View
                        className={`mt-3 h-1 w-full rounded-full ${
                          isActive ? 'bg-purple-400' : 'bg-transparent'
                        }`}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View className="mt-4 flex-row items-center justify-between">
              <View>
                <Text className="text-white text-lg font-bold">
                  {activeTab === 'favorites'
                    ? 'Favoritos'
                    : activeTab === 'pending'
                      ? 'Pendientes'
                      : 'Ocultos'}
                </Text>

                <Text className="mt-1 text-xs text-slate-400">
                  {currentItems.length} obras · Orden: {activeSortLabel}{' '}
                  {sortDirection === 'desc' ? '↓' : '↑'}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setShowSortOptions((prev) => !prev)}
                className={`rounded-full border px-4 py-2 ${
                  showSortOptions
                    ? 'border-purple-500/70 bg-purple-600/25'
                    : 'border-slate-700/70 bg-slate-900/70'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    showSortOptions ? 'text-purple-100' : 'text-slate-300'
                  }`}
                >
                  Ordenar
                </Text>
              </TouchableOpacity>
            </View>

            {showSortOptions && (
              <View className="mt-3 rounded-2xl border border-slate-700/60 bg-slate-900/80 p-3">
                <Text className="mb-3 text-xs font-semibold text-slate-400">
                  Ordenar obras
                </Text>

                <View className="flex-row flex-wrap gap-2">
                  {sortOptions.map((option) => {
                    const isActive = sortMode === option.key;

                    return (
                      <TouchableOpacity
                        key={option.key}
                        activeOpacity={0.85}
                        onPress={() => setSortMode(option.key)}
                        className={`rounded-full border px-3 py-1.5 ${
                          isActive
                            ? 'border-purple-500/70 bg-purple-600/25'
                            : 'border-slate-600/70 bg-slate-800/70'
                        }`}
                      >
                        <Text
                          className={`text-xs font-medium ${
                            isActive ? 'text-purple-100' : 'text-slate-300'
                          }`}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View className="mt-3 flex-row gap-2">
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setSortDirection('desc')}
                    className={`flex-1 rounded-xl border px-3 py-2.5 items-center ${
                      sortDirection === 'desc'
                        ? 'border-purple-500/70 bg-purple-600/25'
                        : 'border-slate-600/70 bg-slate-800/70'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        sortDirection === 'desc' ? 'text-purple-100' : 'text-slate-300'
                      }`}
                    >
                      Descendente
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setSortDirection('asc')}
                    className={`flex-1 rounded-xl border px-3 py-2.5 items-center ${
                      sortDirection === 'asc'
                        ? 'border-purple-500/70 bg-purple-600/25'
                        : 'border-slate-600/70 bg-slate-800/70'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        sortDirection === 'asc' ? 'text-purple-100' : 'text-slate-300'
                      }`}
                    >
                      Ascendente
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
          {/* Artworks Grid */}
          <View className="px-4 pb-4">
            {loadingArtworks && (favorites.length === 0 && pending.length === 0 && notInterested.length === 0) ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color="#c084fc" />
              </View>
            ) : (
              <View key={activeTab}>
                {currentCount === 0 ? (
                  <View className="items-center py-8">
                    <emptyState.icon size={48} color="#64748b" />
                    <Text className="text-slate-400 text-sm mt-3">{emptyState.title}</Text>
                    <Text className="text-slate-500 text-xs mt-1">{emptyState.subtitle}</Text>
                  </View>
                ) : (
                  <>
                    <View className="flex-row flex-wrap">
                      {visibleItems.map((item, index) => (
                        <CulturalGridItem
                          key={item.id || item.originalId}
                          item={item}
                          itemWidth={itemWidth}
                          gap={gap}
                          index={index}
                          onPress={handlePress}
                        />
                      ))}
                    </View>
                    {canLoadMore ? (
                      <TouchableOpacity
                        onPress={loadMoreForActiveTab}
                        className="mt-4 rounded-xl border border-purple-500/40 bg-purple-600/20 py-3 items-center"
                      >
                        <Text className="text-purple-200 text-sm font-semibold">
                          Cargar más ({visibleItems.length}/{currentItems.length})
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text className="mt-4 text-center text-xs text-slate-500">
                        Mostrando {visibleItems.length} obras.
                      </Text>
                    )}
                  </>
                )}
              </View>
            )}
          </View>

        </ScrollView>
        <BottomNavigation />
      </SafeAreaView>
    </BackgroundLayout>
  );
}

function sortItems(items: CulturalItem[], mode: SortMode, direction: SortDirection): CulturalItem[] {
  const arr = [...items];
  const dir = direction === 'asc' ? 1 : -1;
  if (mode === 'recent') {
    arr.sort((a, b) => (getItemTime(a) - getItemTime(b)) * dir);
    return arr;
  }
  if (mode === 'type') {
    arr.sort((a, b) => {
      const byCategory = String(a.category || '').localeCompare(String(b.category || ''), 'es', {
        sensitivity: 'base',
      });
      if (byCategory !== 0) return byCategory * dir;
      return (
        String(a.title || '').localeCompare(String(b.title || ''), 'es', {
          sensitivity: 'base',
        }) * dir
      );
    });
    return arr;
  }
  if (mode === 'author') {
    arr.sort(
      (a, b) =>
        String(a.creator || '').localeCompare(String(b.creator || ''), 'es', { sensitivity: 'base' }) * dir
    );
    return arr;
  }
  arr.sort(
    (a, b) =>
      String(a.title || '').localeCompare(String(b.title || ''), 'es', { sensitivity: 'base' }) * dir
  );
  return arr;
}
