import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  ExternalLink,
  Eye,
  EyeOff,
  Film,
  Gamepad2,
  Heart,
  Languages,
  Music,
  Palette,
  Pause,
  Play,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryIconTabBar } from '../src/components/feed/CategoryIconTabBar';
import { BottomNavigation } from '../src/components/BottomNavigation';
import { BackgroundLayout } from '../src/components/ui/BackgroundLayout';
import { PosterFullscreenViewer } from '../src/components/ui/PosterFullscreenViewer';
import { OptimizedImage } from '../src/components/ui/OptimizedImage';
import { useAuth } from '../src/contexts/AuthContext';
import {
  addToFavorites,
  addToNotInterested,
  getNotInterested,
  removeFromNotInterested,
  addToPending,
  getArtworkById,
  enrichSpotifyAlbumDescription,
  translateArtworkDescriptionToSpanish,
  getFavorites,
  getPending,
  getSimilarArtworks,
  removeFromFavorites,
  removeFromPending,
} from '@/api/client';
import { getAlbumTracks } from '@/api/spotifyMusic';
import { CulturalItem } from '@/types/CulturalItem';
import type { CulturalCategory } from '@/types/CulturalItem';
import {
  buildArtworkConsumptionUrl,
  getExternalSourceActionLabel,
  getExternalSourceButtonBg,
} from '@/utils/artworkConsumptionUrl';
import { storage } from '@/utils/storage';

function isGenericSpotifyAlbumDescription(desc: unknown): boolean {
  if (desc == null) return true;
  const t = String(desc).trim();
  if (t.length < 8) return true;
  const n = t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return /^album con \d+ canciones\.?$/.test(n);
}

const SPOTIFY_ALBUM_DESC_CACHE_PREFIX = 'dl.spotifyAlbumDesc.v1:';

function spotifyAlbumDescCacheKey(logicalId: string) {
  return `${SPOTIFY_ALBUM_DESC_CACHE_PREFIX}${String(logicalId || '').trim()}`;
}

/** Cabecera Descripción + acción traducir / alternar original (Gemini en backend). */
function DescriptionTranslateControl(props: {
  loading: boolean;
  viewingTranslation: boolean;
  hasCachedTranslation: boolean;
  onPress: () => void;
}) {
  const { loading, viewingTranslation, hasCachedTranslation, onPress } = props;
  let label = 'Traducir';
  if (viewingTranslation) label = 'Original';
  else if (hasCachedTranslation) label = 'Traducción';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
      accessibilityLabel={
        viewingTranslation ? 'Ver descripción original' : hasCachedTranslation ? 'Ver traducción' : 'Traducir al español'
      }
      accessibilityRole="button"
      className="flex-row items-center gap-1.5 rounded-lg border border-slate-500/50 bg-slate-800/90 px-2.5 py-2"
      style={actionShadowSubtle}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#94a3b8" />
      ) : (
        <Languages size={16} color="#e2e8f0" strokeWidth={2} />
      )}
      <Text className="text-[11px] font-semibold leading-tight text-slate-100">{label}</Text>
    </TouchableOpacity>
  );
}

const DESCRIPTION_SCROLL_MAX_HEIGHT = 240;

/** Descripción larga con scroll interno para no ocupar toda la ficha. */
function ScrollableDescriptionText({ text }: { text: string }) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  return (
    <ScrollView
      style={{ maxHeight: DESCRIPTION_SCROLL_MAX_HEIGHT }}
      nestedScrollEnabled
      showsVerticalScrollIndicator
      className="rounded-xl border border-slate-700/40 bg-slate-900/40 px-3 py-2"
    >
      <Text className="text-base leading-6 text-slate-300">{trimmed}</Text>
    </ScrollView>
  );
}

function isSpotifyMusicArtwork(item: any): boolean {
  return Boolean(item?.category === 'musica' && item?.source === 'Spotify' && item?.originalId);
}

function toArtworkPayload(item: any): CulturalItem {
  return {
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
    metadata: item.metadata || {},
  };
}

const LEGACY_NOT_INTERESTED_STORAGE_KEY = 'feed.notInterestedIds';

function mergeNotInterestedIdsFromStorage(mergeInto: Set<string>, raw: string | null) {
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.filter((x) => typeof x === 'string').forEach((x) => mergeInto.add(x));
    }
  } catch {
    /* ignore */
  }
}

async function readMergedNotInterestedIdSet(userId: string | undefined): Promise<Set<string>> {
  const storageKey = `feed.notInterestedIds:${userId || 'anon'}`;
  const merged = new Set<string>();
  mergeNotInterestedIdsFromStorage(merged, await storage.getItem(storageKey));
  mergeNotInterestedIdsFromStorage(merged, await storage.getItem(LEGACY_NOT_INTERESTED_STORAGE_KEY));
  return merged;
}

const SIMILAR_CATEGORY_TABS: { key: CulturalCategory; label: string; icon: any }[] = [
  { key: 'cine', label: 'Cine/Series', icon: Film },
  { key: 'musica', label: 'Música', icon: Music },
  { key: 'arte-visual', label: 'Arte Visual', icon: Palette },
  { key: 'literatura', label: 'Literatura', icon: BookOpen },
  { key: 'videojuegos', label: 'Videojuegos', icon: Gamepad2 },
];

const VALID_CATEGORIES = new Set<CulturalCategory>(
  SIMILAR_CATEGORY_TABS.map((tab) => tab.key)
);

function normalizeCategory(value: string | undefined | null): CulturalCategory {
  const cat = String(value || '').trim().toLowerCase() as CulturalCategory;
  return VALID_CATEGORIES.has(cat) ? cat : 'cine';
}

function resolvePosterUri(imageUrl: unknown): string {
  if (!imageUrl) return '';
  if (typeof imageUrl === 'string') return imageUrl;
  if (typeof imageUrl === 'object' && imageUrl !== null && 'uri' in imageUrl) {
    const u = (imageUrl as { uri?: string }).uri;
    return typeof u === 'string' ? u : '';
  }
  return '';
}

const actionShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  android: { elevation: 6 },
  default: {},
});

const actionShadowSubtle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
  },
  android: { elevation: 3 },
  default: {},
});

export default function ArtworkDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { id, itemData } = useLocalSearchParams<{ 
    id: string; 
    itemData?: string;
  }>();
  const [artwork, setArtwork] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [artworkMongoId, setArtworkMongoId] = useState<string | null>(null);
  /** Cola serializada favoritos/guardados: UI optimista al instante, servidor en orden (evita carreras). */
  const artworkListMutationsRef = useRef(Promise.resolve());
  const artworkMongoIdRef = useRef<string | null>(null);
  const isFavoriteRef = useRef(false);
  const isPendingRef = useRef(false);
  /** Se incrementa al mutar favoritos/guardados para ignorar getFavorites/getPending obsoletos. */
  const listInteractionEpochRef = useRef(0);

  useEffect(() => {
    artworkMongoIdRef.current = artworkMongoId;
  }, [artworkMongoId]);
  useEffect(() => {
    isFavoriteRef.current = isFavorite;
  }, [isFavorite]);
  useEffect(() => {
    isPendingRef.current = isPending;
  }, [isPending]);
  const [isNotInterested, setIsNotInterested] = useState(false);
  const [notInterestedMongoId, setNotInterestedMongoId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [similarItemsByCategory, setSimilarItemsByCategory] = useState<
    Record<CulturalCategory, CulturalItem[]>
  >({
    cine: [],
    musica: [],
    'arte-visual': [],
    literatura: [],
    videojuegos: [],
  });
  const [activeSimilarCategory, setActiveSimilarCategory] = useState<CulturalCategory>('cine');
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  // expo-audio: single player for current preview URL (no keep-awake / expo-av)
  const player = useAudioPlayer(activePreviewUrl ?? null, { downloadFirst: true });
  const status = useAudioPlayerStatus(player);
  const hasTriggeredPlayRef = useRef(false);
  // States for categories (music has its own system, other artworks use metadata)
  const [musicGenres, setMusicGenres] = useState<string[]>([]);
  const [musicPlatforms, setMusicPlatforms] = useState<string[]>([]);
  const [musicOther, setMusicOther] = useState<string[]>([]);
  const artworkPayload = useMemo<CulturalItem | null>(
    () => (artwork ? toArtworkPayload(artwork) : null),
    [artwork]
  );
  const artworkPayloadRef = useRef<CulturalItem | null>(null);
  artworkPayloadRef.current = artworkPayload;
  const posterUri = useMemo(() => resolvePosterUri(artwork?.imageUrl), [artwork?.imageUrl]);
  const [posterViewerVisible, setPosterViewerVisible] = useState(false);
  /** Spotify: no mostrar placeholder "Álbum con N canciones"; spinner hasta IA o mensaje si falla. */
  const [spotifyDescPhase, setSpotifyDescPhase] = useState<'idle' | 'loading' | 'done' | 'empty'>('idle');
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null);
  const [showTranslatedDescription, setShowTranslatedDescription] = useState(false);
  const [descTranslateLoading, setDescTranslateLoading] = useState(false);
  const [descTranslateError, setDescTranslateError] = useState<string | null>(null);

  const baseDescriptionForTranslate = useMemo(() => {
    if (!artwork?.description) return '';
    const t = String(artwork.description).trim();
    if (t.length < 8) return '';
    if (isSpotifyMusicArtwork(artwork) && isGenericSpotifyAlbumDescription(artwork.description)) return '';
    return t;
  }, [artwork]);

  useEffect(() => {
    setTranslatedDescription(null);
    setShowTranslatedDescription(false);
    setDescTranslateLoading(false);
    setDescTranslateError(null);
  }, [artwork?.id, artwork?.description]);

  const handleDescriptionTranslate = useCallback(async () => {
    if (showTranslatedDescription && translatedDescription) {
      setShowTranslatedDescription(false);
      return;
    }
    if (translatedDescription && !showTranslatedDescription) {
      setShowTranslatedDescription(true);
      return;
    }
    const text = baseDescriptionForTranslate;
    if (text.length < 2) return;
    setDescTranslateLoading(true);
    setDescTranslateError(null);
    try {
      const res = await translateArtworkDescriptionToSpanish(text);
      if (res.alreadySpanish) {
        Alert.alert('Descripción', 'El texto ya está principalmente en español.');
      } else if (res.text) {
        setTranslatedDescription(res.text);
        setShowTranslatedDescription(true);
      }
    } catch {
      const msg = 'No se pudo traducir. Inténtalo más tarde.';
      setDescTranslateError(msg);
      Alert.alert('Traducción', msg);
    } finally {
      setDescTranslateLoading(false);
    }
  }, [baseDescriptionForTranslate, showTranslatedDescription, translatedDescription]);

  const displayedDescriptionBody = useMemo(() => {
    if (!artwork?.description) return '';
    if (showTranslatedDescription && translatedDescription) return translatedDescription;
    return String(artwork.description);
  }, [artwork?.description, showTranslatedDescription, translatedDescription]);

  // Web / algunos entornos no soportan keep-awake tras setAudioModeAsync → evitar promesa rechazada sin catch.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    void setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);

  /** Enriquecer descripción de álbum Spotify: caché local + API; no repetir si ya hay texto guardado. */
  useEffect(() => {
    if (!artwork) {
      setSpotifyDescPhase('idle');
      return;
    }
    if (!isSpotifyMusicArtwork(artwork)) {
      setSpotifyDescPhase('idle');
      return;
    }
    const aid = String(artwork.id || '').trim();
    if (!aid) {
      setSpotifyDescPhase('idle');
      return;
    }
    if (!isGenericSpotifyAlbumDescription(artwork.description)) {
      setSpotifyDescPhase('done');
      void storage
        .setItem(
          spotifyAlbumDescCacheKey(aid),
          JSON.stringify({
            v: 1,
            description: String(artwork.description).trim(),
            savedAt: Date.now(),
          })
        )
        .catch(() => undefined);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const raw = await storage.getItem(spotifyAlbumDescCacheKey(aid));
        if (cancelled) return;
        if (raw) {
          const j = JSON.parse(raw) as { v?: number; description?: string };
          const d = String(j?.description || '').trim();
          if (d.length >= 24 && !isGenericSpotifyAlbumDescription(d)) {
            setArtwork((prev: any) => {
              if (!prev || String(prev.id) !== aid) return prev;
              return { ...prev, description: d };
            });
            setSpotifyDescPhase('done');
            return;
          }
        }
      } catch {
        /* ignore cache corrupto */
      }
      if (cancelled) return;
      setSpotifyDescPhase('loading');
      try {
        const enriched = await enrichSpotifyAlbumDescription(artwork);
        if (cancelled) return;
        if (enriched?.description) {
          const d = enriched.description.trim();
          await storage
            .setItem(
              spotifyAlbumDescCacheKey(aid),
              JSON.stringify({ v: 1, description: d, savedAt: Date.now() })
            )
            .catch(() => undefined);
          setArtwork((prev: any) => {
            if (!prev || String(prev.id) !== aid) return prev;
            return { ...prev, description: d };
          });
          setSpotifyDescPhase('done');
        } else {
          setSpotifyDescPhase('empty');
        }
      } catch {
        if (!cancelled) setSpotifyDescPhase('empty');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps acotadas: `artwork` entero re-dispararía al actualizar metadata (pistas).
  }, [
    artwork?.id,
    artwork?.source,
    artwork?.category,
    artwork?.originalId,
    artwork?.description,
    artwork?.title,
    artwork?.creator,
    artwork?.year,
  ]);

  const loadTracks = useCallback(async (albumId: string, isMountedRef?: { current: boolean }) => {
    try {
      setLoadingTracks(true);
      const result = await getAlbumTracks(albumId);

      // Solo actualizar si el componente sigue montado
      if (isMountedRef && !isMountedRef.current) return;

      setTracks(result.tracks);

      // Save separated categories
      setMusicGenres(result.genres || []);
      setMusicPlatforms(result.platforms || []);
      setMusicOther(result.other || []);

      // Update artwork genres for FeedScreen (combine all)
      const allGenres = [...(result.genres || []), ...(result.platforms || [])];

      if (allGenres.length > 0) {
        setArtwork((prev: any) => ({
          ...prev,
          metadata: {
            ...prev?.metadata,
            genres: allGenres
          }
        }));
      } else if (result.album?.genres && result.album.genres.length > 0) {
        // Fallback: use album genres if available
        const formatGenres = (genres: string[]): string[] => {
          return genres.map(genre =>
            genre
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ')
          );
        };
        setArtwork((prev: any) => ({
          ...prev,
          metadata: {
            ...prev?.metadata,
            genres: formatGenres(result.album.genres)
          }
        }));
      }
    } catch (err) {
      if (!isMountedRef || isMountedRef.current) {
        console.error('Error loading tracks:', err);
      }
    } finally {
      if (!isMountedRef || isMountedRef.current) {
        setLoadingTracks(false);
      }
    }
  }, []);

  const loadArtwork = useCallback(async (isMountedRef?: { current: boolean }) => {
    try {
      setLoading(true);
      setError(null);
      // Try to get from backend first
      const data = await getArtworkById(id);

      // Solo actualizar si el componente sigue montado
      if (isMountedRef && !isMountedRef.current) return;

      setArtwork(data);
      // Si es música, cargar las canciones
      if (isSpotifyMusicArtwork(data)) {
        loadTracks(String(data.originalId), isMountedRef);
      }
    } catch (err: any) {
      // Solo actualizar si el componente sigue montado
      if (isMountedRef && !isMountedRef.current) return;

      console.error('Error loading artwork from backend:', err);
      // If it fails, try to use basic data if available
      if (itemData) {
        try {
          const parsed = JSON.parse(itemData);
          setArtwork(parsed);
          // If it's music, load the tracks
          if (isSpotifyMusicArtwork(parsed)) {
            loadTracks(String(parsed.originalId), isMountedRef);
          }
        } catch {
          const errorMessage = err.response?.data?.message || err.message || 'Error al cargar la obra';
          setError(typeof errorMessage === 'string' ? errorMessage : 'Error al cargar la obra');
        }
      } else {
        const errorMessage = err.response?.data?.message || err.message || 'Error al cargar la obra';
        setError(typeof errorMessage === 'string' ? errorMessage : 'Error al cargar la obra');
      }
    } finally {
      if (!isMountedRef || isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [id, itemData, loadTracks]);

  useEffect(() => {
    const isMountedRef = { current: true };

    if (itemData) {
      try {
        const parsed = JSON.parse(itemData);
        if (!isMountedRef.current) return;
        setArtwork(parsed);
        setLoading(false);
        if (isSpotifyMusicArtwork(parsed)) {
          loadTracks(String(parsed.originalId), isMountedRef);
        }
        // itemData suele traer la descripción genérica antigua; si la obra ya está en BD con texto enriquecido, refrescar.
        if (id) {
          void (async () => {
            try {
              const server = await getArtworkById(id);
              if (!isMountedRef.current) return;
              setArtwork(server);
              if (isSpotifyMusicArtwork(server)) {
                loadTracks(String(server.originalId), isMountedRef);
              }
            } catch {
              if (!isMountedRef.current) return;
            }
          })();
        }
      } catch (e) {
        console.error('Error parsing itemData:', e);
        if (isMountedRef.current) {
          loadArtwork(isMountedRef);
        }
      }
    } else if (id) {
      loadArtwork(isMountedRef);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [id, itemData, loadArtwork, loadTracks]);

  /** Al volver a la ficha (misma ruta montada) refrescar desde BD: itemData suele seguir con la descripción antigua. */
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      const alive = { current: true };
      void (async () => {
        try {
          const server = await getArtworkById(String(id));
          if (!alive.current) return;
          setArtwork((prev: any) => {
            if (!prev) return server;
            if (String(prev.id) !== String(server.id)) return prev;
            return { ...prev, ...server };
          });
        } catch {
          /* obra aún no persistida en BD */
        }
      })();
      return () => {
        alive.current = false;
      };
    }, [id])
  );

  // When preview URL is set and loaded, start playback once
  useEffect(() => {
    if (activePreviewUrl && status?.isLoaded && !hasTriggeredPlayRef.current) {
      hasTriggeredPlayRef.current = true;
      player.play();
    }
  }, [activePreviewUrl, status?.isLoaded, player]);

  // When URL changes, allow play trigger again
  useEffect(() => {
    if (!activePreviewUrl) {
      hasTriggeredPlayRef.current = false;
    }
  }, [activePreviewUrl]);

  // When playback finishes, clear current track
  useEffect(() => {
    if (
      activePreviewUrl &&
      status &&
      status.isLoaded &&
      !status.playing &&
      status.duration > 0 &&
      status.currentTime >= status.duration - 0.1
    ) {
      setActivePreviewUrl(null);
      setPlayingTrackId(null);
      hasTriggeredPlayRef.current = false;
    }
  }, [activePreviewUrl, status]);

  // Check if artwork is in favorites and pending when loaded
  // Uses aggressive cache - only calls API if there's no valid cache
  useEffect(() => {
    listInteractionEpochRef.current = 0;
    let isMounted = true;

    const checkArtworkStatus = async () => {
      if (!artwork || !user?._id) return;

      const epochAtStart = listInteractionEpochRef.current;

      try {
        // Get favorites and pending - getFavorites/getPending already use cache
        // Will only make request if there's no valid cache (3 minutes)
        const [favorites, pending] = await Promise.all([
          getFavorites(),
          getPending()
        ]);

        // Only update if component is still mounted
        if (!isMounted || epochAtStart !== listInteractionEpochRef.current) return;

        const favItem: CulturalItem | undefined = favorites.find((fav) => fav.id === artwork.id);
        const inFavorites = !!favItem;
        const pendItem: CulturalItem | undefined = pending.find((pend) => pend.id === artwork.id);
        const inPending = !!pendItem;

        setIsFavorite(inFavorites);
        isFavoriteRef.current = inFavorites;
        setIsPending(inPending);
        isPendingRef.current = inPending;

        let nextMongoId: string | null = null;
        if (inFavorites && favItem?._id) nextMongoId = favItem._id.toString();
        else if (inPending && pendItem?._id) nextMongoId = pendItem._id.toString();
        setArtworkMongoId(nextMongoId);
        artworkMongoIdRef.current = nextMongoId;
      } catch (error) {
        if (isMounted) {
          console.error('Error checking artwork status:', error);
        }
      }
    };

    // Only check if we have a valid artwork
    if (artwork?.id) {
      checkArtworkStatus();
    }
    
    // Cleanup: mark as unmounted
    return () => {
      isMounted = false;
    };
    // Only execute when artwork.id changes, not on every artwork change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artwork?.id, user?._id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!artwork?.id) {
        if (!cancelled) {
          setIsNotInterested(false);
          setNotInterestedMongoId(null);
        }
        return;
      }
      const id = artwork.id;
      const local = await readMergedNotInterestedIdSet(user?._id);
      const inLocal = local.has(id);
      let mongo: string | null = null;
      if (user?._id) {
        try {
          const list = await getNotInterested();
          const row = list.find((x: CulturalItem) => x.id === id);
          if (row?._id) mongo = String(row._id);
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) {
        setNotInterestedMongoId(mongo);
        setIsNotInterested(inLocal || !!mongo);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [artwork?.id, user?._id]);

  const similarSeed = useMemo(() => {
    if (!artwork?.title || !artwork?.category) return '';
    // No incluir `description`: al enriquecer el álbum con IA cambia el texto y disparaba de nuevo
    // 5× getSimilarArtworks (Gemini) en paralelo, en conflicto con el propio enriquecimiento.
    return JSON.stringify({
      id: artwork.id,
      title: artwork.title,
      category: artwork.category,
      creator: artwork.creator,
      genres: artwork?.metadata?.genres || [],
    });
  }, [artwork?.id, artwork?.title, artwork?.category, artwork?.creator, artwork?.metadata?.genres]);

  useEffect(() => {
    let cancelled = false;
    const loadSimilar = async () => {
      const artworkPayload = artworkPayloadRef.current;
      if (!similarSeed || !artworkPayload) {
        if (!cancelled) {
          setSimilarItemsByCategory({
            cine: [],
            musica: [],
            'arte-visual': [],
            literatura: [],
            videojuegos: [],
          });
        }
        return;
      }
      const defaultCategory = normalizeCategory(artworkPayload.category);
      setActiveSimilarCategory(defaultCategory);
      setLoadingSimilar(true);
      try {
        const baseArtwork = {
          id: artworkPayload.id,
          title: artworkPayload.title,
          category: artworkPayload.category,
          creator: artworkPayload.creator,
          // Álbum Spotify: no mandar el párrafo de descripción enriquecida al recomendador (solo título/autor/géneros).
          description: isSpotifyMusicArtwork(artworkPayload)
            ? ''
            : artworkPayload.description || '',
          metadata: artworkPayload.metadata || {},
        };
        const byCategorySettled = await Promise.allSettled(
          SIMILAR_CATEGORY_TABS.map(async (tab) => {
            const items = await getSimilarArtworks(baseArtwork, {
              limit: 3,
              targetCategory: tab.key,
              timeoutMs: 45000,
            });
            return [tab.key, items.slice(0, 3)] as const;
          })
        );
        const byCategory = byCategorySettled
          .filter((result): result is PromiseFulfilledResult<readonly [CulturalCategory, CulturalItem[]]> => result.status === 'fulfilled')
          .map((result) => result.value);
        if (!cancelled) {
          setSimilarItemsByCategory({
            cine: byCategory.find(([key]) => key === 'cine')?.[1] || [],
            musica: byCategory.find(([key]) => key === 'musica')?.[1] || [],
            'arte-visual': byCategory.find(([key]) => key === 'arte-visual')?.[1] || [],
            literatura: byCategory.find(([key]) => key === 'literatura')?.[1] || [],
            videojuegos: byCategory.find(([key]) => key === 'videojuegos')?.[1] || [],
          });
        }
      } catch {
        if (!cancelled) {
          setSimilarItemsByCategory({
            cine: [],
            musica: [],
            'arte-visual': [],
            literatura: [],
            videojuegos: [],
          });
        }
      } finally {
        if (!cancelled) setLoadingSimilar(false);
      }
    };
    loadSimilar();
    return () => {
      cancelled = true;
    };
  }, [similarSeed]);

  const activeSimilarItems = similarItemsByCategory[activeSimilarCategory] || [];

  const enqueueArtworkListMutation = useCallback((run: () => Promise<void>) => {
    artworkListMutationsRef.current = artworkListMutationsRef.current
      .then(run)
      .catch((err) => {
        console.warn('[artwork-details] mutación favoritos/guardados:', err);
      });
  }, []);

  const playPreview = useCallback((previewUrl: string, trackId: string) => {
    if (playingTrackId === trackId && activePreviewUrl) {
      player.pause();
      setActivePreviewUrl(null);
      setPlayingTrackId(null);
      hasTriggeredPlayRef.current = false;
      return;
    }
    setActivePreviewUrl(previewUrl);
    setPlayingTrackId(trackId);
    hasTriggeredPlayRef.current = false;
  }, [playingTrackId, activePreviewUrl, player]);

  const handleToggleFavorite = useCallback(() => {
    if (!artwork || !user || !artworkPayload) return;

    listInteractionEpochRef.current += 1;

    const prevFavorite = isFavoriteRef.current;
    const prevPending = isPendingRef.current;
    const nextFavorite = !prevFavorite;

    isFavoriteRef.current = nextFavorite;
    setIsFavorite(nextFavorite);
    if (nextFavorite && prevPending) {
      isPendingRef.current = false;
      setIsPending(false);
    }

    enqueueArtworkListMutation(async () => {
      try {
        if (nextFavorite) {
          const mongoId = artworkMongoIdRef.current;
          if (prevPending && mongoId) {
            try {
              await removeFromPending(mongoId);
            } catch (e) {
              console.warn('removeFromPending antes de favorito:', e);
            }
          }
          const result = await addToFavorites(artworkPayload);
          const newId = result.data?.artworkId;
          if (newId) {
            artworkMongoIdRef.current = newId;
            setArtworkMongoId(newId);
          }
        } else {
          let mongoId = artworkMongoIdRef.current;
          if (!mongoId) {
            const favorites = await getFavorites();
            const favItem = favorites.find((fav: any) => fav.id === artwork.id);
            mongoId = favItem?._id?.toString() || null;
          }
          if (mongoId) {
            await removeFromFavorites(mongoId);
            if (!isPendingRef.current) {
              artworkMongoIdRef.current = null;
              setArtworkMongoId(null);
            }
          }
        }
      } catch (error: any) {
        console.error('Error toggling favorite:', error);
        isFavoriteRef.current = prevFavorite;
        setIsFavorite(prevFavorite);
        if (nextFavorite && prevPending) {
          isPendingRef.current = true;
          setIsPending(true);
        }
      }
    });
  }, [artwork, user, artworkPayload, enqueueArtworkListMutation]);

  const handleTogglePending = useCallback(() => {
    if (!artwork || !user || !artworkPayload) return;

    listInteractionEpochRef.current += 1;

    const prevPending = isPendingRef.current;
    const prevFavorite = isFavoriteRef.current;
    const nextPending = !prevPending;

    isPendingRef.current = nextPending;
    setIsPending(nextPending);
    if (nextPending && prevFavorite) {
      isFavoriteRef.current = false;
      setIsFavorite(false);
    }

    enqueueArtworkListMutation(async () => {
      try {
        if (nextPending) {
          const mongoId = artworkMongoIdRef.current;
          if (prevFavorite && mongoId) {
            try {
              await removeFromFavorites(mongoId);
            } catch (e) {
              console.warn('removeFromFavorites antes de quitar guardado:', e);
            }
          }
          const result = await addToPending(artworkPayload);
          const newId = result.data?.artworkId;
          if (newId) {
            artworkMongoIdRef.current = newId;
            setArtworkMongoId(newId);
          }
        } else {
          let mongoId = artworkMongoIdRef.current;
          if (!mongoId) {
            const pending = await getPending();
            const pendItem = pending.find((pend: any) => pend.id === artwork.id);
            mongoId = pendItem?._id?.toString() || null;
          }
          if (mongoId) {
            await removeFromPending(mongoId);
            if (!isFavoriteRef.current) {
              artworkMongoIdRef.current = null;
              setArtworkMongoId(null);
            }
          }
        }
      } catch (error: any) {
        console.error('Error toggling pending:', error);
        isPendingRef.current = prevPending;
        setIsPending(prevPending);
        if (nextPending && prevFavorite) {
          isFavoriteRef.current = true;
          setIsFavorite(true);
        }
      }
    });
  }, [artwork, user, artworkPayload, enqueueArtworkListMutation]);

  const handleSimilarPress = useCallback((item: CulturalItem) => {
    router.push({
      pathname: '/artwork-details',
      params: {
        id: item.id,
        source: item.source,
        originalId: String(item.originalId),
        itemData: JSON.stringify(item),
      },
    });
  }, [router]);

  const handleNotInterested = useCallback(() => {
    if (!artwork?.id) return;
    const storageKey = `feed.notInterestedIds:${user?._id || 'anon'}`;
    const payload = toArtworkPayload(artwork);
    const id = artwork.id;

    if (isNotInterested) {
      setIsNotInterested(false);
      void (async () => {
        try {
          const merged = await readMergedNotInterestedIdSet(user?._id);
          merged.delete(id);
          await storage.setItem(storageKey, JSON.stringify(Array.from(merged)));

          if (user?._id) {
            let mongo = notInterestedMongoId;
            if (!mongo) {
              const list = await getNotInterested();
              const row = list.find((x: CulturalItem) => x.id === id);
              mongo = row?._id ? String(row._id) : null;
            }
            if (mongo) await removeFromNotInterested(mongo);
          }
          setNotInterestedMongoId(null);
        } catch (err) {
          console.error('Error al dejar de ocultar obra:', err);
          setIsNotInterested(true);
        }
      })();
      return;
    }

    setIsNotInterested(true);
    void (async () => {
      try {
        const merged = await readMergedNotInterestedIdSet(user?._id);
        merged.add(id);
        await storage.setItem(storageKey, JSON.stringify(Array.from(merged)));

        if (user?._id) {
          const res = await addToNotInterested(payload);
          if (res.data?.artworkId) setNotInterestedMongoId(String(res.data.artworkId));
        }
      } catch (err) {
        console.error('Error al ocultar obra:', err);
        setIsNotInterested(false);
        try {
          const merged = await readMergedNotInterestedIdSet(user?._id);
          merged.delete(id);
          await storage.setItem(storageKey, JSON.stringify(Array.from(merged)));
        } catch {
          /* ignore */
        }
      }
    })();

    router.back();
  }, [artwork, user?._id, router, isNotInterested, notInterestedMongoId]);

  const getCategoryName = (cat: string) => {
    switch(cat) {
      case 'cine': return 'Cine/Series';
      case 'videojuegos': return 'Videojuegos';
      case 'literatura': return 'Literatura';
      case 'musica': return 'Música';
      case 'arte-visual': return 'Arte Visual';
      default: return cat;
    }
  };

  if (loading) {
    return (
      <BackgroundLayout>
        <SafeAreaView className="flex-1">
          <StatusBar barStyle="light-content" />
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#c084fc" />
            <Text className="mt-4 text-slate-400">Cargando detalles...</Text>
          </View>
        </SafeAreaView>
      </BackgroundLayout>
    );
  }

  if (error || !artwork) {
    return (
      <BackgroundLayout>
        <SafeAreaView className="flex-1">
          <StatusBar barStyle="light-content" />
          <View className="flex-1 justify-center items-center px-4">
            <Text className="text-red-400 text-lg mb-2 text-center">
              {error || 'Obra no encontrada'}
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              className="mt-4 bg-purple-600 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">Volver</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </BackgroundLayout>
    );
  }

  // Get tags (tone_tags from model or empty array)
  const tags = artwork.tone_tags || [];

  // Extract categories from metadata for all artworks
  const genres = artwork.metadata?.genres || [];
  const artworkTags = artwork.metadata?.tags || [];
  const artworkPlatforms = artwork.metadata?.platforms || [];
  const artworkOther = artwork.metadata?.other || [];

  // For music, use specific states if available
  const displayGenres = artwork.category === 'musica' && musicGenres.length > 0 ? musicGenres : genres;
  const displayTags = artworkTags;
  const displayPlatforms = artwork.category === 'musica' && musicPlatforms.length > 0 ? musicPlatforms : artworkPlatforms;
  const displayOther = artwork.category === 'musica' && musicOther.length > 0 ? musicOther : artworkOther;

  /** Una sola lista para la UI: géneros, tags IGDB, plataformas, extra y tone_tags, sin duplicados. */
  const combinedDetailTags = (() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (arr: string[]) => {
      for (const raw of arr) {
        const t = String(raw ?? '').trim();
        if (!t) continue;
        const k = t.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(t);
      }
    };
    push(displayGenres);
    push(displayTags);
    push(displayPlatforms);
    push(displayOther);
    push(Array.isArray(tags) ? tags : []);
    return out;
  })();

  const showTagsLoadingMusic =
    artwork.category === 'musica' &&
    loadingTracks &&
    displayGenres.length === 0 &&
    (artwork.metadata?.genres?.length ?? 0) > 0;

  const externalConsumptionUrl = buildArtworkConsumptionUrl(artwork);
  const externalLinkLabel = getExternalSourceActionLabel(artwork.source);
  const externalLinkButtonBg = getExternalSourceButtonBg(artwork.source);

  return (
    <BackgroundLayout>
      <SafeAreaView className="flex-1" edges={['bottom', 'left', 'right']}>
        <StatusBar barStyle="light-content" />

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Hero: tap para ver completa con zoom */}
          <View className="relative overflow-hidden rounded-b-3xl">
            <Pressable
              onPress={() => posterUri && setPosterViewerVisible(true)}
              disabled={!posterUri}
              accessibilityRole="imagebutton"
              accessibilityLabel="Ver póster a pantalla completa"
              className="active:opacity-95"
            >
              <Image
                source={artwork.imageUrl}
                style={{ width: '100%', height: 400, backgroundColor: '#1e293b' }}
                contentFit="cover"
                cachePolicy="memory-disk"
                priority="high"
                recyclingKey={artwork.id}
                transition={220}
              />
              <LinearGradient
                colors={['transparent', 'rgba(15,23,42,0.92)']}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />
            </Pressable>

            <TouchableOpacity
              onPress={() => router.back()}
              className="absolute left-3 h-11 w-11 items-center justify-center rounded-full bg-black/45"
              style={{ top: Math.max(insets.top, 12) }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Volver"
            >
              <ArrowLeft size={22} color="#fff" />
            </TouchableOpacity>

            <View
              className={`absolute bottom-3 left-3 right-3 flex-row items-center gap-2 ${
                externalConsumptionUrl ? 'justify-between' : ''
              }`}
            >
              <View
                className={`h-10 justify-center rounded-full bg-slate-800/95 px-3 ${
                  externalConsumptionUrl ? 'max-w-[48%]' : 'max-w-[88%] self-start'
                }`}
              >
                <Text className="text-sm font-medium text-white" numberOfLines={1}>
                  {getCategoryName(artwork.category)}
                </Text>
              </View>
              {externalConsumptionUrl ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(externalConsumptionUrl)}
                  activeOpacity={0.88}
                  style={[{ backgroundColor: externalLinkButtonBg }, actionShadow]}
                  className="h-10 max-w-[48%] flex-row items-center gap-1.5 rounded-full px-3"
                  accessibilityRole="link"
                  accessibilityLabel={externalLinkLabel}
                >
                  <ExternalLink size={15} color="#fff" strokeWidth={2} />
                  <Text className="shrink text-xs font-bold text-white" numberOfLines={1}>
                    {externalLinkLabel}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View className="h-2" />

          {/* Content */}
          <View className="px-4">
            {/* Title */}
            <Text className="text-3xl font-bold text-white mb-2">
              {artwork.title}
            </Text>

            {/* Creator and Year */}
            <View className="flex-row items-center mb-4">
              <Text className="text-lg text-slate-300">
                {artwork.creator}
              </Text>
              {artwork.year && (
                <>
                  <Text className="text-lg text-slate-500 mx-2">•</Text>
                  <Text className="text-lg text-slate-400">{artwork.year}</Text>
                </>
              )}
            </View>

            {/* Tres acciones: mismo ancho y altura */}
            <View className="mb-5 flex-row gap-2">
              <TouchableOpacity
                onPress={handleToggleFavorite}
                disabled={!user}
                activeOpacity={0.85}
                accessibilityLabel={isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
                accessibilityRole="button"
                className={`min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-2 ${
                  isFavorite
                    ? 'border-rose-500/35 bg-rose-600'
                    : 'border-slate-600/40 bg-slate-800/75'
                }`}
                style={actionShadowSubtle}
              >
                <Heart size={16} color="#fff" fill={isFavorite ? '#fff' : 'none'} strokeWidth={2} />
                <Text className="text-center text-[11px] font-semibold leading-tight text-white" numberOfLines={2}>
                  Favorito
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleTogglePending}
                disabled={!user}
                activeOpacity={0.85}
                accessibilityLabel={isPending ? 'Quitar de guardados' : 'Guardar obra'}
                accessibilityRole="button"
                className={`min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-2 ${
                  isPending
                    ? 'border-amber-400/35 bg-amber-500'
                    : 'border-slate-600/40 bg-slate-800/75'
                }`}
                style={actionShadowSubtle}
              >
                <Bookmark
                  size={16}
                  color="#fff"
                  fill={isPending ? '#fff' : 'none'}
                  strokeWidth={2}
                />
                <Text className="text-center text-[11px] font-semibold leading-tight text-white" numberOfLines={2}>
                  Guardado
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleNotInterested}
                activeOpacity={0.85}
                accessibilityLabel={isNotInterested ? 'Mostrar obra en el feed' : 'Ocultar obra del feed'}
                accessibilityRole="button"
                className={`min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-2 ${
                  isNotInterested
                    ? 'border-violet-500/50 bg-violet-950/45'
                    : 'border-slate-600/45 bg-slate-900/55'
                }`}
                style={actionShadowSubtle}
              >
                {isNotInterested ? (
                  <Eye size={16} color="#c4b5fd" strokeWidth={2} />
                ) : (
                  <EyeOff size={16} color="#94a3b8" strokeWidth={2} />
                )}
                <Text
                  className="text-center text-[11px] font-semibold leading-tight text-slate-100"
                  numberOfLines={2}
                >
                  {isNotInterested ? 'Mostrar' : 'Ocultar'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Descripción: Spotify no muestra el placeholder "Álbum con N canciones"; spinner o mensaje si no hay IA */}
            {isSpotifyMusicArtwork(artwork) ? (
              <View className="mb-6">
                {(spotifyDescPhase === 'idle' || spotifyDescPhase === 'loading') && (
                  <View className="items-center py-10" accessibilityLabel="Cargando descripción">
                    <ActivityIndicator size="small" color="#94a3b8" />
                  </View>
                )}
                {spotifyDescPhase === 'empty' && (
                  <>
                    <Text className="text-xl font-semibold text-white mb-3">Descripción</Text>
                    <Text className="text-base text-slate-400 leading-6">
                      No se ha encontrado descripción.
                    </Text>
                  </>
                )}
                {spotifyDescPhase === 'done' &&
                  artwork.description &&
                  !isGenericSpotifyAlbumDescription(artwork.description) && (
                    <>
                      <View className="mb-3 flex-row items-center justify-between gap-2">
                        <Text className="mr-2 shrink text-xl font-semibold text-white">Descripción</Text>
                        {baseDescriptionForTranslate.length > 0 ? (
                          <DescriptionTranslateControl
                            loading={descTranslateLoading}
                            viewingTranslation={showTranslatedDescription}
                            hasCachedTranslation={Boolean(translatedDescription)}
                            onPress={handleDescriptionTranslate}
                          />
                        ) : null}
                      </View>
                      {showTranslatedDescription && translatedDescription ? (
                        <Text className="mb-2 text-xs text-slate-500">Traducción automática (IA)</Text>
                      ) : null}
                      {descTranslateError ? (
                        <Text className="mb-2 text-sm text-rose-400">{descTranslateError}</Text>
                      ) : null}
                      <ScrollableDescriptionText text={displayedDescriptionBody} />
                    </>
                  )}
              </View>
            ) : (
              artwork.description ? (
                <View className="mb-6">
                  <View className="mb-3 flex-row items-center justify-between gap-2">
                    <Text className="mr-2 shrink text-xl font-semibold text-white">Descripción</Text>
                    {baseDescriptionForTranslate.length > 0 ? (
                      <DescriptionTranslateControl
                        loading={descTranslateLoading}
                        viewingTranslation={showTranslatedDescription}
                        hasCachedTranslation={Boolean(translatedDescription)}
                        onPress={handleDescriptionTranslate}
                      />
                    ) : null}
                  </View>
                  {showTranslatedDescription && translatedDescription ? (
                    <Text className="mb-2 text-xs text-slate-500">Traducción automática (IA)</Text>
                  ) : null}
                  {descTranslateError ? (
                    <Text className="mb-2 text-sm text-rose-400">{descTranslateError}</Text>
                  ) : null}
                  <ScrollableDescriptionText text={displayedDescriptionBody} />
                </View>
              ) : null
            )}

            {/* Lista de Canciones (solo para música) */}
            {artwork.category === 'musica' && (
              <View className="mb-6">
                <Text className="text-xl font-semibold text-white mb-3">
                  Canciones
                </Text>
                {loadingTracks ? (
                  <View className="py-4">
                    <ActivityIndicator size="small" color="#22c55e" />
                  </View>
                ) : tracks.length > 0 ? (
                  <View>
                    {tracks.map((track, idx) => {
                      const isPlaying = playingTrackId === track.id;
                      const hasPreview = !!track.preview_url;
                      const trackSpotifyUrl = track.external_urls?.spotify;
                      const minutes = track.duration_ms ? Math.floor(track.duration_ms / 60000) : 0;
                      const seconds = track.duration_ms ? Math.floor((track.duration_ms % 60000) / 1000) : 0;
                      const artistsText = track.artists?.map((a: any) => a.name).join(', ') || 'Artista desconocido';

                      return (
                        <View
                          key={track.id || `track-${idx}`}
                          className={`bg-slate-800/60 rounded-xl p-4 flex-row items-center justify-between ${idx < tracks.length - 1 ? 'mb-2' : ''}`}
                        >
                          <View className="flex-1 mr-3">
                            <Text className="text-white font-medium text-base mb-1" numberOfLines={1}>
                              {track.name}
                            </Text>
                            <Text className="text-slate-400 text-sm" numberOfLines={1}>
                              {artistsText}
                            </Text>
                            {track.duration_ms && (
                              <Text className="text-slate-500 text-xs mt-1">
                                {minutes}:{seconds.toString().padStart(2, '0')}
                              </Text>
                            )}
                          </View>
                          <View className="flex-row items-center gap-2">
                            <TouchableOpacity
                              onPress={() => hasPreview && playPreview(track.preview_url, track.id)}
                              disabled={!hasPreview}
                              className={`w-12 h-12 rounded-full items-center justify-center ${
                                hasPreview
                                  ? isPlaying
                                    ? 'bg-red-600'
                                    : 'bg-green-600'
                                  : 'bg-slate-700 opacity-50'
                              }`}
                              activeOpacity={0.7}
                            >
                              {hasPreview ? (
                                isPlaying ? (
                                  <Pause size={20} color="#fff" fill="#fff" />
                                ) : (
                                  <Play size={20} color="#fff" fill="#fff" />
                                )
                              ) : (
                                <Music size={20} color="#94a3b8" />
                              )}
                            </TouchableOpacity>

                            {trackSpotifyUrl && (
                              <TouchableOpacity
                                onPress={() => Linking.openURL(trackSpotifyUrl)}
                                className="bg-slate-700 w-12 h-12 rounded-full items-center justify-center"
                                activeOpacity={0.7}
                              >
                                <ExternalLink size={18} color="#22c55e" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text className="text-slate-400 text-sm">
                    No se pudieron cargar las canciones
                  </Text>
                )}
              </View>
            )}

            {/* Obras similares recomendadas por IA */}
            <View className="mb-6">
              <Text className="text-xl font-semibold text-white mb-3">
                Obras similares para ti
              </Text>
              <View className="mb-4">
                <CategoryIconTabBar
                  tabs={SIMILAR_CATEGORY_TABS}
                  selectedKeys={[activeSimilarCategory]}
                  onToggle={setActiveSimilarCategory}
                />
              </View>
              {loadingSimilar ? (
                <View className="py-4">
                  <ActivityIndicator size="small" color="#a855f7" />
                </View>
              ) : activeSimilarItems.length > 0 ? (
                <View className="flex-row gap-2">
                  {activeSimilarItems.slice(0, 3).map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden"
                      activeOpacity={0.85}
                      onPress={() => handleSimilarPress(item)}
                    >
                      <OptimizedImage
                        source={{ uri: item.imageUrl }}
                        style={{ width: '100%', height: 130 }}
                        resizeMode="cover"
                        placeholderColor="#334155"
                        recyclingKey={item.id}
                        priority="low"
                      />
                      <View className="p-2">
                        <Text className="text-white text-xs font-semibold" numberOfLines={2}>
                          {item.title}
                        </Text>
                        <Text className="text-slate-400 text-[10px] mt-1" numberOfLines={1}>
                          {item.creator}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text className="text-slate-500 text-sm">
                  No encontramos obras similares de {SIMILAR_CATEGORY_TABS.find((x) => x.key === activeSimilarCategory)?.label?.toLowerCase() || 'esta categoría'} ahora mismo.
                </Text>
              )}
            </View>

            {(combinedDetailTags.length > 0 || showTagsLoadingMusic) && (
              <View className="mb-6">
                <Text className="text-xl font-semibold text-white mb-3">Tags</Text>
                {showTagsLoadingMusic && combinedDetailTags.length === 0 ? (
                  <View className="py-2">
                    <ActivityIndicator size="small" color="#a855f7" />
                  </View>
                ) : (
                  <View className="flex-row flex-wrap gap-2">
                    {combinedDetailTags.map((label: string, idx: number) => (
                      <View
                        key={`${label}-${idx}`}
                        className="bg-purple-600/30 border border-purple-500/50 px-4 py-2 rounded-full"
                      >
                        <Text className="text-sm text-purple-300 font-medium">{label}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
        <BottomNavigation />
      </SafeAreaView>

      <PosterFullscreenViewer
        visible={posterViewerVisible && Boolean(posterUri)}
        uri={posterUri}
        onClose={() => setPosterViewerVisible(false)}
      />
    </BackgroundLayout>
  );
}
