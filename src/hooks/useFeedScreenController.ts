import { useFocusEffect } from 'expo-router';
import { Alert, Dimensions } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addToFavorites,
  addToPending,
  fetchPersonalizedFeedCurated,
  getFavorites,
  getNotInterested,
  getPending,
  invalidatePersonalizedFeedCache,
  invalidateUserArtworkListCaches,
  PersonalizedFeedCuratedPayload,
  removeFromFavorites,
  removeFromPending,
} from '@/api/client';
import { globalSearch, GlobalSearchFilters } from '@/api/globalSearch';
import { useAuth } from '@/contexts/AuthContext';
import { CulturalCategory, CulturalItem } from '@/types/CulturalItem';
import { getApiAlertMessage } from '@/utils/apiError';
import { prefetchImageUris } from '@/utils/imagePrefetch';
import { storage } from '@/utils/storage';
import {
  FEED_CARD_ASPECT_RATIO,
  FEED_GRID_GAP,
  FEED_H_PAD,
  FEED_ITEMS_PER_CATEGORY_SECTION,
  RECOMMENDATION_CARD_WIDTH,
} from '../components/feed/feedConstants';

export type FeedFilterCategoryOption = {
  key: CulturalCategory;
  label: string;
  icon: any;
};

const normalizeText = (value: string | undefined | null): string =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const getItemLanguage = (item: CulturalItem): string => {
  const metadata = item.metadata as Record<string, unknown> | undefined;
  const languageCandidate =
    metadata?.language ??
    metadata?.originalLanguage ??
    metadata?.lang ??
    metadata?.idioma ??
    metadata?.locale;
  return normalizeText(typeof languageCandidate === 'string' ? languageCandidate : '');
};

const isAllowedLanguage = (language: string): boolean => {
  /** Sin campo de idioma en metadata (caso habitual en TMDB/IGDB/Spotify/etc.): no filtrar. */
  if (!language) return true;
  return (
    language === 'es' ||
    language === 'en' ||
    language.includes('spanish') ||
    language.includes('espanol') ||
    language.includes('español') ||
    language.includes('ingles') ||
    language.includes('english') ||
    language.includes('en-us') ||
    language.includes('en-gb') ||
    language.includes('es-es')
  );
};

const isValidSearchItem = (item: CulturalItem): boolean => {
  const title = normalizeText(item.title);
  const creator = normalizeText(item.creator);
  const language = getItemLanguage(item);
  /** Título + creador bastan; descripción opcional (TMDB/Google a veces la devuelven vacía). */
  return Boolean(title && creator && isAllowedLanguage(language));
};

const getSearchScore = (item: CulturalItem, query: string): number => {
  const q = normalizeText(query);
  if (!q) return 0;
  const title = normalizeText(item.title);
  const creator = normalizeText(item.creator);
  const description = normalizeText(item.description);
  const tokens = q.split(/\s+/).filter(Boolean);

  let score = 0;
  if (title === q) score += 150;
  if (title.startsWith(q)) score += 120;
  if (title.includes(q)) score += 90;
  if (creator.includes(q)) score += 45;
  if (description.includes(q)) score += 30;

  for (const token of tokens) {
    if (title.includes(token)) score += 16;
    if (title.startsWith(token)) score += 14;
    if (creator.includes(token)) score += 8;
    if (description.includes(token)) score += 5;
  }

  if (item.rating) score += Math.min(item.rating, 10) * 0.4;
  return score;
};

export function useFeedScreenController(filterCategories: FeedFilterCategoryOption[]) {
  const { user } = useAuth();
  const [showSearchScreen, setShowSearchScreen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<CulturalItem[]>([]);
  const [favoritesRecommendations, setFavoritesRecommendations] = useState<CulturalItem[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<CulturalItem[]>([]);
  const [searchItems, setSearchItems] = useState<CulturalItem[]>([]);
  const [loading, setLoading] = useState(true);
  /** Feed OCEAN vacío pero el servidor sigue generando con IA (sin mostrar anclas como falsa recomendación). */
  const [awaitingOceanFeed, setAwaitingOceanFeed] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [refreshingFeed, setRefreshingFeed] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Map<string, { mongoId?: string }>>(new Map());
  const [pendingIds, setPendingIds] = useState<Map<string, { mongoId?: string }>>(new Map());
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<CulturalCategory[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [notInterestedIds, setNotInterestedIds] = useState<Set<string>>(new Set());
  const notInterestedStorageKey = useMemo(
    () => `feed.notInterestedIds:${user?._id || 'anon'}`,
    [user?._id]
  );

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const loadingArtworksRef = useRef(false);
  const feedRebuildPollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchFilters = useMemo<GlobalSearchFilters>(() => ({
    categories: selectedCategories,
    genres: selectedGenres,
  }), [selectedCategories, selectedGenres]);

  const hasActiveFilters = useMemo(() => {
    return (
      selectedCategories.length > 0 ||
      selectedGenres.length > 0
    );
  }, [selectedCategories, selectedGenres]);

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
        const slice = data
          .filter(isValidSearchItem)
          .sort((a, b) => getSearchScore(b, trimmed) - getSearchScore(a, trimmed))
          .slice(0, 200);
        setSearchItems(slice);
        prefetchImageUris(slice.map((i) => i.imageUrl), 32);
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
      prefetchImageUris(data.map((i) => i.imageUrl), 32);
      setFavoritesRecommendations([]);
    }
  }, [fetchGlobalDefaultItems]);

  const loadPersonalizedDefault = useCallback(async (signal?: AbortSignal, options?: { force?: boolean }) => {
    try {
      // No reutilizar en memoria un feed "ready" viejo: cada carga pide datos actuales al servidor.
      invalidatePersonalizedFeedCache();
      const [oceanPayload, favoritesPayload] = await Promise.all([
        fetchPersonalizedFeedCurated({
          userId: user?._id,
          force: Boolean(options?.force),
          preferFavorites: false,
        }).catch((): PersonalizedFeedCuratedPayload => ({ items: [] })),
        fetchPersonalizedFeedCurated({
          userId: user?._id,
          force: Boolean(options?.force),
          preferFavorites: true,
        }).catch((): PersonalizedFeedCuratedPayload => ({ items: [] })),
      ]);
      if (signal?.aborted) return;
      const list = oceanPayload.items || [];
      const favoritesList = Array.isArray(favoritesPayload.items) ? favoritesPayload.items : [];
      const isBuilding =
        oceanPayload.buildStatus === 'building' || favoritesPayload.buildStatus === 'building';
      setAwaitingOceanFeed(
        Boolean(user?._id) &&
          oceanPayload.buildStatus === 'building' &&
          list.length === 0
      );
      setFavoritesRecommendations(favoritesList.slice(0, 15));
      if (list.length > 0) {
        setAwaitingOceanFeed(false);
        const main = list.slice(0, 200);
        setItems(main);
        prefetchImageUris(
          [...main, ...favoritesList.slice(0, 15)].map((i) => i.imageUrl),
          40
        );
        if (isBuilding && !feedRebuildPollTimerRef.current) {
          feedRebuildPollTimerRef.current = setTimeout(() => {
            feedRebuildPollTimerRef.current = null;
            loadPersonalizedDefault(undefined, { force: false });
          }, 4000);
        }
        return;
      }
      setItems([]);
      if (
        !isBuilding ||
        oceanPayload.buildStatus === 'failed' ||
        favoritesPayload.buildStatus === 'failed'
      ) {
        setAwaitingOceanFeed(false);
      }
      if (isBuilding && !feedRebuildPollTimerRef.current) {
        feedRebuildPollTimerRef.current = setTimeout(() => {
          feedRebuildPollTimerRef.current = null;
          loadPersonalizedDefault(undefined, { force: false });
        }, 4000);
      }
    } catch (e) {
      console.warn('Feed personalizado no disponible', e);
      if (!signal?.aborted) {
        setAwaitingOceanFeed(false);
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
    setSelectedGenres([]);
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
      setAwaitingOceanFeed(false);
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
      if (feedRebuildPollTimerRef.current) {
        clearTimeout(feedRebuildPollTimerRef.current);
        feedRebuildPollTimerRef.current = null;
      }
    };
  }, [user?._id, loadPersonalizedDefault, runGlobalDefault]);

  const syncFeedUserLists = useCallback(async () => {
    try {
      if (!user?._id) {
        setFavoriteIds(new Map());
        setPendingIds(new Map());
        setFavoriteItems([]);
        const raw = await storage.getItem(notInterestedStorageKey);
        if (!raw) {
          setNotInterestedIds(new Set());
          return;
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setNotInterestedIds(new Set(parsed.filter((v) => typeof v === 'string')));
        }
        return;
      }

      invalidateUserArtworkListCaches();
      const [favorites, pending, notList] = await Promise.all([
        getFavorites(),
        getPending(),
        getNotInterested().catch(() => [] as CulturalItem[]),
      ]);

      const favoritesMap = new Map<string, { mongoId?: string }>();
      favorites.forEach((fav: CulturalItem) => favoritesMap.set(fav.id, { mongoId: fav._id?.toString() }));
      setFavoriteIds(favoritesMap);
      setFavoriteItems(favorites);

      const pendingMap = new Map<string, { mongoId?: string }>();
      pending.forEach((pend: CulturalItem) => pendingMap.set(pend.id, { mongoId: pend._id?.toString() }));
      setPendingIds(pendingMap);

      if (favoritesMap.size === 0) {
        setFavoritesRecommendations([]);
      }

      const mergedNi = new Set<string>();
      for (const it of notList) {
        if (it?.id && typeof it.id === 'string') mergedNi.add(it.id);
      }
      const rawLocal = await storage.getItem(notInterestedStorageKey);
      if (rawLocal) {
        try {
          const parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed)) {
            parsed
              .filter((v: unknown) => typeof v === 'string')
              .forEach((id: string) => mergedNi.add(id));
          }
        } catch {
          /* ignore */
        }
      }
      const legacyRaw = await storage.getItem('feed.notInterestedIds');
      if (legacyRaw) {
        try {
          const parsed = JSON.parse(legacyRaw);
          if (Array.isArray(parsed)) {
            parsed
              .filter((v: unknown) => typeof v === 'string')
              .forEach((id: string) => mergedNi.add(id));
          }
        } catch {
          /* ignore */
        }
      }
      setNotInterestedIds(mergedNi);
      await storage.setItem(notInterestedStorageKey, JSON.stringify(Array.from(mergedNi)));
    } catch (error) {
      console.error('Error syncing feed user lists:', error);
    }
  }, [user?._id, notInterestedStorageKey]);

  useFocusEffect(
    useCallback(() => {
      syncFeedUserLists();
      return undefined;
    }, [syncFeedUserLists])
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
      if (loadingArtworksRef.current) return;
      loadingArtworksRef.current = true;

      try {
        await syncFeedUserLists();
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
  }, [user?._id, syncFeedUserLists]);

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
    const maxRecommendations = 15;
    const minPerType = 3;
    const categoriesPresent = new Set(
      favoriteItems
        .map((fav) => fav.category)
        .filter((c): c is CulturalCategory => Boolean(c))
    );
    const orderedFromFilter = filterCategories
      .map((c) => c.key)
      .filter((key) => categoriesPresent.has(key));
    const extraCategories = [...categoriesPresent].filter((k) => !orderedFromFilter.includes(k));
    extraCategories.sort((a, b) => a.localeCompare(b));
    const favoriteTypeOrder = [...orderedFromFilter, ...extraCategories];
    const candidatePool = favoritesRecommendations.filter(
      (item) => !notInterestedIds.has(item.id) && !favoriteIds.has(item.id)
    );

    if (!favoriteTypeOrder.length) {
      return candidatePool.slice(0, maxRecommendations);
    }

    const groupedByType = new Map<CulturalCategory, CulturalItem[]>();
    for (const candidate of candidatePool) {
      const existing = groupedByType.get(candidate.category) || [];
      existing.push(candidate);
      groupedByType.set(candidate.category, existing);
    }

    const picked: CulturalItem[] = [];
    const pickedIds = new Set<string>();
    for (const favoriteType of favoriteTypeOrder) {
      const typeCandidates = groupedByType.get(favoriteType) || [];
      let taken = 0;
      for (const item of typeCandidates) {
        if (pickedIds.has(item.id)) continue;
        picked.push(item);
        pickedIds.add(item.id);
        taken += 1;
        if (taken >= minPerType || picked.length >= maxRecommendations) break;
      }
      if (picked.length >= maxRecommendations) break;
    }

    if (picked.length < maxRecommendations) {
      for (const item of candidatePool) {
        if (pickedIds.has(item.id)) continue;
        picked.push(item);
        pickedIds.add(item.id);
        if (picked.length >= maxRecommendations) break;
      }
    }

    return picked;
  }, [favoritesRecommendations, notInterestedIds, favoriteItems, favoriteIds, filterCategories]);

  const recommendationsByCategory = useMemo(() => {
    const grouped = new Map<CulturalCategory, CulturalItem[]>();
    filteredItems.forEach((item) => {
      const list = grouped.get(item.category) || [];
      if (list.length < FEED_ITEMS_PER_CATEGORY_SECTION) list.push(item);
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
    setSelectedGenres([]);
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
    awaitingOceanFeed,
    searchLoading,
    refreshingFeed,
    hasSearched,
    showFilters,
    setShowFilters,
    selectedCategories,
    selectedGenres,
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
