import { useFocusEffect } from 'expo-router';
import { Alert, Dimensions } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addToFavorites,
  addToPending,
  fetchPersonalizedFeedCurated,
  getFavorites,
  getPending,
  invalidatePersonalizedFeedCache,
  removeFromFavorites,
  removeFromPending,
} from '@/api/client';
import { globalSearch, GlobalSearchFilters } from '@/api/globalSearch';
import { useAuth } from '@/contexts/AuthContext';
import { CulturalCategory, CulturalItem } from '@/types/CulturalItem';
import { getApiAlertMessage } from '@/utils/apiError';
import { storage } from '@/utils/storage';
import {
  FEED_CARD_ASPECT_RATIO,
  FEED_GRID_GAP,
  FEED_H_PAD,
  RECOMMENDATION_CARD_WIDTH,
} from '../components/feed/feedConstants';

export type FeedFilterCategoryOption = {
  key: CulturalCategory;
  label: string;
  icon: any;
};

export function useFeedScreenController(filterCategories: FeedFilterCategoryOption[]) {
  const { user } = useAuth();
  const [showSearchScreen, setShowSearchScreen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<CulturalItem[]>([]);
  const [favoritesRecommendations, setFavoritesRecommendations] = useState<CulturalItem[]>([]);
  const [searchItems, setSearchItems] = useState<CulturalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [refreshingFeed, setRefreshingFeed] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Map<string, { mongoId?: string }>>(new Map());
  const [pendingIds, setPendingIds] = useState<Map<string, { mongoId?: string }>>(new Map());
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<CulturalCategory[]>([]);
  const [selectedCinemaType, setSelectedCinemaType] = useState<'all' | 'movie' | 'series'>('all');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedAuthor, setSelectedAuthor] = useState<string>('all');
  const [yearFrom, setYearFrom] = useState<string>('1900');
  const [yearTo, setYearTo] = useState<string>(String(new Date().getFullYear()));
  const [notInterestedIds, setNotInterestedIds] = useState<Set<string>>(new Set());
  const notInterestedStorageKey = useMemo(
    () => `feed.notInterestedIds:${user?._id || 'anon'}`,
    [user?._id]
  );

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const loadingArtworksRef = useRef(false);

  const searchFilters = useMemo<GlobalSearchFilters>(() => ({
    categories: selectedCategories,
    cinemaType: selectedCinemaType,
    genres: selectedGenres,
    author: selectedAuthor,
    yearFrom: yearFrom.trim(),
    yearTo: yearTo.trim(),
  }), [selectedCategories, selectedCinemaType, selectedGenres, selectedAuthor, yearFrom, yearTo]);

  const hasActiveFilters = useMemo(() => {
    const currentYear = String(new Date().getFullYear());
    return (
      selectedCategories.length > 0 ||
      selectedCinemaType !== 'all' ||
      selectedGenres.length > 0 ||
      (selectedAuthor !== 'all' && selectedAuthor.trim().length > 0) ||
      yearFrom.trim() !== '1900' ||
      yearTo.trim() !== currentYear
    );
  }, [selectedCategories, selectedCinemaType, selectedGenres, selectedAuthor, yearFrom, yearTo]);

  const performSearch = useCallback(async (text: string, signal?: AbortSignal) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setSearchItems([]);
      setHasSearched(false);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    try {
      const data = await globalSearch(trimmed, { signal, filters: searchFilters });
      if (!signal?.aborted) {
        setSearchItems(data.slice(0, 200));
        setHasSearched(true);
        setSearchLoading(false);
      }
    } catch (error) {
      if (!signal?.aborted) {
        setSearchLoading(false);
        console.error('Error performing search:', error);
      }
    }
  }, [searchFilters]);

  const triggerImmediateSearch = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    performSearch(query);
  }, [performSearch, query]);

  const fetchGlobalDefaultItems = useCallback(async (signal?: AbortSignal): Promise<CulturalItem[]> => {
    try {
      const data = await globalSearch('', { signal });
      if (signal?.aborted) return [];
      return data.slice(0, 200);
    } catch (error) {
      if (!signal?.aborted) console.error('Error loading default feed:', error);
      return [];
    }
  }, []);

  const runGlobalDefault = useCallback(async (signal?: AbortSignal) => {
    const data = await fetchGlobalDefaultItems(signal);
    if (!signal?.aborted) {
      setItems(data);
      setFavoritesRecommendations([]);
    }
  }, [fetchGlobalDefaultItems]);

  const loadPersonalizedDefault = useCallback(async (signal?: AbortSignal, options?: { force?: boolean }) => {
    try {
      const [oceanPayload, favoritesPayload] = await Promise.all([
        fetchPersonalizedFeedCurated({
          userId: user?._id,
          force: Boolean(options?.force),
          preferFavorites: false,
        }).catch(() => ({ items: [] as CulturalItem[] })),
        fetchPersonalizedFeedCurated({
          userId: user?._id,
          force: Boolean(options?.force),
          preferFavorites: true,
        }).catch(() => ({ items: [] as CulturalItem[] })),
      ]);
      if (signal?.aborted) return;
      const list = oceanPayload.items || [];
      const favoritesList = Array.isArray(favoritesPayload.items) ? favoritesPayload.items : [];
      setFavoritesRecommendations(favoritesList.slice(0, 15));
      if (list.length > 0) {
        setItems(list.slice(0, 200));
        return;
      }
      setItems([]);
    } catch (e) {
      console.warn('Feed personalizado no disponible', e);
      if (!signal?.aborted) {
        setItems([]);
        setFavoritesRecommendations([]);
      }
    }
  }, [user?._id]);

  const refreshFeed = useCallback(async () => {
    setShowSearchScreen(false);
    setShowFilters(false);
    setQuery('');
    setSearchItems([]);
    setHasSearched(false);
    setSearchLoading(false);
    setSelectedCategories([]);
    setSelectedCinemaType('all');
    setSelectedGenres([]);
    setSelectedAuthor('all');
    setYearFrom('1900');
    setYearTo(String(new Date().getFullYear()));
    setLoading(true);
    setRefreshingFeed(true);
    try {
      invalidatePersonalizedFeedCache();
      if (user?._id) {
        await loadPersonalizedDefault(undefined, { force: true });
      } else {
        await runGlobalDefault();
      }
    } catch (error) {
      console.warn('No se pudo refrescar el feed personalizado', error);
      setItems([]);
      setFavoritesRecommendations([]);
    } finally {
      setRefreshingFeed(false);
      setLoading(false);
    }
  }, [loadPersonalizedDefault, runGlobalDefault, user?._id]);

  const debouncedSearch = useCallback((text: string) => {
    if (searchAbortControllerRef.current) searchAbortControllerRef.current.abort();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    searchAbortControllerRef.current = new AbortController();
    debounceTimerRef.current = setTimeout(() => {
      performSearch(text, searchAbortControllerRef.current?.signal);
    }, 500);
  }, [performSearch]);

  useEffect(() => {
    const abortController = new AbortController();
    setLoading(true);
    const run = user?._id
      ? loadPersonalizedDefault(abortController.signal)
      : runGlobalDefault(abortController.signal);
    run.finally(() => {
      if (!abortController.signal.aborted) setLoading(false);
    });

    return () => {
      abortController.abort();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [user?._id, loadPersonalizedDefault, runGlobalDefault]);

  const loadNotInterestedIds = useCallback(async () => {
    try {
      const raw = await storage.getItem(notInterestedStorageKey);
      if (!raw) return setNotInterestedIds(new Set());
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setNotInterestedIds(new Set(parsed.filter((v) => typeof v === 'string')));
    } catch (error) {
      console.error('Error loading not interested IDs:', error);
    }
  }, [notInterestedStorageKey]);

  useEffect(() => {
    loadNotInterestedIds();
  }, [loadNotInterestedIds]);

  useFocusEffect(
    useCallback(() => {
      loadNotInterestedIds();
      return undefined;
    }, [loadNotInterestedIds])
  );

  useEffect(() => {
    if (showSearchScreen && query.trim().length > 0) {
      debouncedSearch(query);
    } else if (!query.trim()) {
      setSearchItems([]);
      setHasSearched(false);
      setSearchLoading(false);
    }
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [showSearchScreen, query, debouncedSearch]);

  useEffect(() => {
    if (!showSearchScreen || !hasSearched || query.trim().length === 0) return;
    performSearch(query);
  }, [showSearchScreen, hasSearched, query, searchFilters, performSearch]);

  useEffect(() => {
    let isMounted = true;
    if (loadingArtworksRef.current) return;

    const loadUserArtworks = async () => {
      if (!user?._id || loadingArtworksRef.current) return;
      loadingArtworksRef.current = true;

      try {
        const [favorites, pending] = await Promise.all([getFavorites(), getPending()]);
        if (!isMounted) {
          loadingArtworksRef.current = false;
          return;
        }

        const favoritesMap = new Map<string, { mongoId?: string }>();
        favorites.forEach((fav: CulturalItem) => favoritesMap.set(fav.id, { mongoId: fav._id?.toString() }));
        setFavoriteIds(favoritesMap);

        const pendingMap = new Map<string, { mongoId?: string }>();
        pending.forEach((pend: CulturalItem) => pendingMap.set(pend.id, { mongoId: pend._id?.toString() }));
        setPendingIds(pendingMap);
      } catch (error) {
        if (isMounted) console.error('Error loading user artworks:', error);
      } finally {
        loadingArtworksRef.current = false;
      }
    };

    loadUserArtworks();
    return () => {
      isMounted = false;
      loadingArtworksRef.current = false;
      setFavoriteIds(new Map());
      setPendingIds(new Map());
      setUpdatingItems(new Set());
    };
  }, [user?._id]);

  const getCategoryIcon = useCallback((cat: string) => {
    return filterCategories.find((c) => c.key === cat)?.icon || filterCategories[0]?.icon;
  }, [filterCategories]);

  const getCategoryColor = useCallback((cat: string) => {
    switch (cat) {
      case 'cine': return '#3b82f6';
      case 'videojuegos': return '#a855f7';
      case 'literatura': return '#facc15';
      case 'musica': return '#22c55e';
      case 'arte-visual': return '#f472b6';
      default: return '#666';
    }
  }, []);

  const getCinemaMediaType = useCallback((item: CulturalItem): 'movie' | 'series' | 'unknown' => {
    if (item.metadata?.mediaType === 'movie' || item.metadata?.mediaType === 'series') {
      return item.metadata.mediaType;
    }
    if (item.id.startsWith('movie-')) return 'movie';
    if (item.id.startsWith('tv-')) return 'series';
    return 'unknown';
  }, []);

  const getCinemaTypeLabel = useCallback((item: CulturalItem): string | null => {
    if (item.category !== 'cine') return null;
    const mediaType = getCinemaMediaType(item);
    if (mediaType === 'movie') return 'Película';
    if (mediaType === 'series') return 'Serie';
    return null;
  }, [getCinemaMediaType]);

  const filteredItems = useMemo(
    () => items.filter((item) => !notInterestedIds.has(item.id)),
    [items, notInterestedIds]
  );
  const filteredSearchItems = useMemo(
    () => searchItems.filter((item) => !notInterestedIds.has(item.id)),
    [searchItems, notInterestedIds]
  );

  const principalRecommendations = useMemo(() => {
    const firstByCategory = new Map<CulturalCategory, CulturalItem>();
    for (const item of filteredItems) {
      if (!firstByCategory.has(item.category)) {
        firstByCategory.set(item.category, item);
      }
    }
    const selected: CulturalItem[] = [];
    const selectedIds = new Set<string>();

    for (const category of filterCategories) {
      const pick = firstByCategory.get(category.key);
      if (!pick) continue;
      selected.push(pick);
      selectedIds.add(pick.id);
    }

    if (selected.length < 10) {
      const byRating = [...filteredItems].sort((a, b) => (b.rating || 0) - (a.rating || 0));
      for (const item of byRating) {
        if (selectedIds.has(item.id)) continue;
        selected.push(item);
        selectedIds.add(item.id);
        if (selected.length >= 10) break;
      }
    }

    return selected;
  }, [filteredItems, filterCategories]);
  const favoritesRecommendationLine = useMemo(() => {
    if (!favoritesRecommendations.length) return [];
    return favoritesRecommendations.filter((item) => !notInterestedIds.has(item.id)).slice(0, 15);
  }, [favoritesRecommendations, notInterestedIds]);

  const recommendationsByCategory = useMemo(() => {
    const grouped = new Map<CulturalCategory, CulturalItem[]>();
    filteredItems.forEach((item) => {
      const list = grouped.get(item.category) || [];
      if (list.length < 15) list.push(item);
      grouped.set(item.category, list);
    });

    return filterCategories
      .map((category) => ({
        key: category.key,
        label: category.label,
        icon: category.icon,
        data: grouped.get(category.key) || [],
      }))
      .filter((section) => section.data.length > 0);
  }, [filteredItems, filterCategories]);

  const availableGenres = useMemo(() => {
    const unique = new Set<string>();
    items.forEach((item) => {
      (item.metadata?.genres || []).forEach((genre) => {
        if (genre?.trim()) unique.add(genre.trim());
      });
    });
    return Array.from(unique).slice(0, 15);
  }, [items]);

  const availableAuthors = useMemo(() => {
    const unique = new Set<string>();
    items.forEach((item) => {
      if (item.creator?.trim()) unique.add(item.creator.trim());
    });
    return ['all', ...Array.from(unique).slice(0, 30)];
  }, [items]);

  const { feedCardWidth, feedPosterHeight } = useMemo(() => {
    const w = Dimensions.get('window').width;
    const cardWidth = (w - FEED_H_PAD * 2 - FEED_GRID_GAP) / 2;
    const posterHeight = Math.round(cardWidth * FEED_CARD_ASPECT_RATIO);
    return { feedCardWidth: cardWidth, feedPosterHeight: posterHeight };
  }, []);
  const recommendationCardWidth = RECOMMENDATION_CARD_WIDTH;
  const recommendationPosterHeight = Math.round(recommendationCardWidth * FEED_CARD_ASPECT_RATIO);

  const toggleCategory = useCallback((category: CulturalCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  }, []);

  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedCategories([]);
    setSelectedCinemaType('all');
    setSelectedGenres([]);
    setSelectedAuthor('all');
    setYearFrom('1900');
    setYearTo(String(new Date().getFullYear()));
  }, []);

  const handleToggleFavorite = useCallback(async (item: CulturalItem, e: any) => {
    e.stopPropagation();
    if (!user) return Alert.alert('Inicia sesión', 'Debes iniciar sesión para agregar favoritos');

    const itemId = item.id;
    const favoriteData = favoriteIds.get(itemId);
    const isFavorite = !!favoriteData;
    const updatingKey = `fav-${itemId}`;
    if (updatingItems.has(updatingKey)) return;

    setUpdatingItems((prev) => new Set(prev).add(updatingKey));
    try {
      if (isFavorite) {
        const mongoId = favoriteData?.mongoId;
        if (mongoId) {
          await removeFromFavorites(mongoId);
        } else {
          const favorites = await getFavorites();
          const favItem = favorites.find((fav: CulturalItem) => fav.id === itemId);
          if (favItem?._id) await removeFromFavorites(favItem._id.toString());
        }
        setFavoriteIds((prev) => {
          const next = new Map(prev);
          next.delete(itemId);
          return next;
        });
      } else {
        const pendingData = pendingIds.get(itemId);
        if (pendingData?.mongoId) {
          try {
            await removeFromPending(pendingData.mongoId);
            setPendingIds((prev) => {
              const next = new Map(prev);
              next.delete(itemId);
              return next;
            });
          } catch (error) {
            console.error('Error removing from pending:', error);
          }
        }
        const result = await addToFavorites({ ...item, metadata: item.metadata || {} });
        const mongoId = result.data?.artworkId;
        setFavoriteIds((prev) => {
          const next = new Map(prev);
          next.set(itemId, { mongoId });
          return next;
        });
      }
    } catch (error: unknown) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', getApiAlertMessage(error, 'No se pudo actualizar el favorito'));
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(updatingKey);
        return next;
      });
    }
  }, [user, favoriteIds, pendingIds, updatingItems]);

  const handleTogglePending = useCallback(async (item: CulturalItem, e: any) => {
    e.stopPropagation();
    if (!user) return Alert.alert('Inicia sesión', 'Debes iniciar sesión para agregar a pendientes');

    const itemId = item.id;
    const pendingData = pendingIds.get(itemId);
    const isPending = !!pendingData;
    const updatingKey = `pend-${itemId}`;
    if (updatingItems.has(updatingKey)) return;

    setUpdatingItems((prev) => new Set(prev).add(updatingKey));
    try {
      if (isPending) {
        const mongoId = pendingData?.mongoId;
        if (mongoId) {
          await removeFromPending(mongoId);
        } else {
          const pending = await getPending();
          const pendItem = pending.find((pend: CulturalItem) => pend.id === itemId);
          if (pendItem?._id) await removeFromPending(pendItem._id.toString());
        }
        setPendingIds((prev) => {
          const next = new Map(prev);
          next.delete(itemId);
          return next;
        });
      } else {
        const favoriteData = favoriteIds.get(itemId);
        if (favoriteData?.mongoId) {
          try {
            await removeFromFavorites(favoriteData.mongoId);
            setFavoriteIds((prev) => {
              const next = new Map(prev);
              next.delete(itemId);
              return next;
            });
          } catch (error) {
            console.error('Error removing from favorites:', error);
          }
        }
        const result = await addToPending({ ...item, metadata: item.metadata || {} });
        const mongoId = result.data?.artworkId;
        setPendingIds((prev) => {
          const next = new Map(prev);
          next.set(itemId, { mongoId });
          return next;
        });
      }
    } catch (error: unknown) {
      console.error('Error toggling pending:', error);
      Alert.alert('Error', getApiAlertMessage(error, 'No se pudo actualizar la lista de pendientes'));
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(updatingKey);
        return next;
      });
    }
  }, [user, favoriteIds, pendingIds, updatingItems]);

  return {
    showSearchScreen,
    setShowSearchScreen,
    query,
    setQuery,
    loading,
    searchLoading,
    refreshingFeed,
    hasSearched,
    showFilters,
    setShowFilters,
    selectedCategories,
    selectedCinemaType,
    setSelectedCinemaType,
    selectedGenres,
    selectedAuthor,
    setSelectedAuthor,
    yearFrom,
    setYearFrom,
    yearTo,
    setYearTo,
    hasActiveFilters,
    favoriteIds,
    pendingIds,
    updatingItems,
    filteredItems,
    filteredSearchItems,
    principalRecommendations,
    favoritesRecommendationLine,
    recommendationsByCategory,
    availableGenres,
    availableAuthors,
    feedCardWidth,
    feedPosterHeight,
    recommendationCardWidth,
    recommendationPosterHeight,
    toggleCategory,
    toggleGenre,
    clearFilters,
    handleToggleFavorite,
    handleTogglePending,
    getCategoryIcon,
    getCategoryColor,
    getCinemaTypeLabel,
    performSearch,
    triggerImmediateSearch,
    refreshFeed,
  };
}
