import { Audio } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clock, ExternalLink, Heart, Music, Pause, Play } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Linking,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackgroundLayout } from '../src/components/ui/BackgroundLayout';
import { useAuth } from '../src/contexts/AuthContext';
import { addToFavorites, addToPending, getArtworkById, getFavorites, getPending, removeFromFavorites, removeFromPending } from '../src/services/DL_api/api';
import { getAlbumTracks } from '../src/services/external_api/music';
import { CulturalItem } from '../src/types/CulturalItem';

export default function ArtworkDetailsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { id, source, originalId, itemData } = useLocalSearchParams<{ 
    id: string; 
    source?: string; 
    originalId?: string; 
    itemData?: string;
  }>();
  const [artwork, setArtwork] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [artworkMongoId, setArtworkMongoId] = useState<string | null>(null);
  const [updatingFavorite, setUpdatingFavorite] = useState(false);
  const [updatingPending, setUpdatingPending] = useState(false);
  const [tracks, setTracks] = useState<any[]>([]);
  const [albumData, setAlbumData] = useState<any>(null);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  // States for categories (music has its own system, other artworks use metadata)
  const [musicGenres, setMusicGenres] = useState<string[]>([]);
  const [musicTags, setMusicTags] = useState<string[]>([]);
  const [musicPlatforms, setMusicPlatforms] = useState<string[]>([]);
  const [musicOther, setMusicOther] = useState<string[]>([]);

  useEffect(() => {
    const isMountedRef = { current: true };

    if (itemData) {
      // If we have the item data directly, use it
      try {
        const parsed = JSON.parse(itemData);
        if (isMountedRef.current) {
          setArtwork(parsed);
          setLoading(false);
          // If it's music, load the tracks
          if (parsed.category === 'musica' && parsed.source === 'Spotify' && parsed.originalId) {
            loadTracks(String(parsed.originalId), isMountedRef);
          }
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

    // Cleanup: stop audio when component unmounts
    return () => {
      isMountedRef.current = false;
      if (sound) {
        // Clear listener before unmounting
        if (playbackStatusUpdateRef.current) {
          sound.setOnPlaybackStatusUpdate(null);
          playbackStatusUpdateRef.current = null;
        }
        sound.unloadAsync().catch(() => {});
      }
    };
  }, [id, itemData]);

  // Check if artwork is in favorites and pending when loaded
  // Uses aggressive cache - only calls API if there's no valid cache
  useEffect(() => {
    let isMounted = true;
    
    const checkArtworkStatus = async () => {
      if (!artwork || !user?._id) return;

      try {
        // Get favorites and pending - getFavorites/getPending already use cache
        // Will only make request if there's no valid cache (3 minutes)
        const [favorites, pending] = await Promise.all([
          getFavorites(),
          getPending()
        ]);

        // Only update if component is still mounted
        if (!isMounted) return;

        // Check if artwork is in favorites (compare by unique id)
        const favItem: CulturalItem | undefined = favorites.find((fav) => fav.id === artwork.id);
        const inFavorites = !!favItem;
        setIsFavorite(inFavorites);

        // If in favorites, get its MongoDB ID
        if (inFavorites && favItem?._id) {
          setArtworkMongoId(favItem._id.toString());
        }

        // Check if artwork is in pending
        const pendItem: CulturalItem | undefined = pending.find((pend) => pend.id === artwork.id);
        const inPending = !!pendItem;
        setIsPending(inPending);

        // If in pending and we don't have MongoDB ID, get it
        if (inPending && pendItem?._id && !artworkMongoId) {
          setArtworkMongoId(pendItem._id.toString());
        }
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

  const loadTracks = async (albumId: string, isMountedRef?: { current: boolean }) => {
    try {
      setLoadingTracks(true);
      const result = await getAlbumTracks(albumId);
      
      // Solo actualizar si el componente sigue montado
      if (isMountedRef && !isMountedRef.current) return;
      
      setTracks(result.tracks);
      setAlbumData(result.album);
      
      // Save separated categories
      setMusicGenres(result.genres || []);
      setMusicTags(result.tags || []);
      setMusicPlatforms(result.platforms || []);
      setMusicOther(result.other || []);
      
      // Update artwork genres for FeedScreen (combine all)
      const allGenres = [
        ...(result.genres || []),
        ...(result.tags || []),
        ...(result.platforms || [])
      ];
      
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
  };

  const playbackStatusUpdateRef = useRef<((status: any) => void) | null>(null);

  const playPreview = useCallback(async (previewUrl: string, trackId: string) => {
    try {
      // If it's the same track playing, stop it
      if (playingTrackId === trackId && sound) {
        await stopPreview();
        return;
      }

      // If another sound is playing, stop it first and clear listener
      if (sound) {
        if (playbackStatusUpdateRef.current) {
          sound.setOnPlaybackStatusUpdate(null);
          playbackStatusUpdateRef.current = null;
        }
        await sound.unloadAsync();
        setSound(null);
        setPlayingTrackId(null);
      }

      // Play the new preview
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: previewUrl },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setPlayingTrackId(trackId);

      // Create listener and save it in ref to clean it later
      const statusUpdate = (status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingTrackId(null);
          setSound(null);
          playbackStatusUpdateRef.current = null;
        }
      };
      
      playbackStatusUpdateRef.current = statusUpdate;
      newSound.setOnPlaybackStatusUpdate(statusUpdate);
    } catch (err) {
      console.error('Error playing preview:', err);
      // Clear state in case of error
      setPlayingTrackId(null);
      setSound(null);
      playbackStatusUpdateRef.current = null;
    }
  }, [playingTrackId, sound]);

  const stopPreview = useCallback(async () => {
    if (sound) {
      // Limpiar listener antes de desmontar
      if (playbackStatusUpdateRef.current) {
        sound.setOnPlaybackStatusUpdate(null);
        playbackStatusUpdateRef.current = null;
      }
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setPlayingTrackId(null);
    }
  }, [sound]);

  const loadArtwork = async (isMountedRef?: { current: boolean }) => {
    try {
      setLoading(true);
      setError(null);
      // Try to get from backend first
      const data = await getArtworkById(id);
      
      // Solo actualizar si el componente sigue montado
      if (isMountedRef && !isMountedRef.current) return;
      
      setArtwork(data);
      // Si es música, cargar las canciones
      if (data?.category === 'musica' && data?.source === 'Spotify' && data?.originalId) {
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
          if (parsed.category === 'musica' && parsed.source === 'Spotify' && parsed.originalId) {
            loadTracks(String(parsed.originalId), isMountedRef);
          }
        } catch (e) {
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
  };

  const handleToggleFavorite = async () => {
    if (!artwork || !user) return;

    setUpdatingFavorite(true);
    try {
      if (isFavorite) {
        // Remove from favorites - use saved mongoId
        if (artworkMongoId) {
          await removeFromFavorites(artworkMongoId);
          setIsFavorite(false);
          setArtworkMongoId(null);
        } else {
          // Fallback: if we don't have MongoDB ID, search (only in exceptional cases)
          const favorites = await getFavorites();
          const favItem = favorites.find((fav: any) => fav.id === artwork.id);
          if (favItem?._id) {
            await removeFromFavorites(favItem._id.toString());
            setIsFavorite(false);
          }
        }
      } else {
        // Add to favorites - first remove from pending if it's there
        if (isPending && artworkMongoId) {
          try {
            await removeFromPending(artworkMongoId);
            setIsPending(false);
          } catch (error) {
            console.error('Error removing from pending:', error);
          }
        }

        const artworkData: CulturalItem = {
          id: artwork.id,
          originalId: artwork.originalId,
          source: artwork.source,
          title: artwork.title,
          category: artwork.category,
          imageUrl: artwork.imageUrl,
          creator: artwork.creator,
          year: artwork.year,
          description: artwork.description,
          rating: artwork.rating,
          metadata: artwork.metadata || {}
        };
        const result = await addToFavorites(artworkData);
        setIsFavorite(true);
        // Si el backend retorna el artworkId, guardarlo
        if (result.data?.artworkId) {
          setArtworkMongoId(result.data.artworkId);
        }
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      // Revert state in case of error
      setIsFavorite(!isFavorite);
    } finally {
      setUpdatingFavorite(false);
    }
  };

  const handleTogglePending = async () => {
    if (!artwork || !user) return;

    setUpdatingPending(true);
    try {
      if (isPending) {
        // Remove from pending - use saved mongoId
        if (artworkMongoId) {
          await removeFromPending(artworkMongoId);
          setIsPending(false);
          // Only clear artworkMongoId if not in favorites
          if (!isFavorite) {
            setArtworkMongoId(null);
          }
        } else {
          // Fallback: if we don't have MongoDB ID, search (only in exceptional cases)
          const pending = await getPending();
          const pendItem = pending.find((pend: any) => pend.id === artwork.id);
          if (pendItem?._id) {
            await removeFromPending(pendItem._id.toString());
            setIsPending(false);
          }
        }
      } else {
        // Add to pending - first remove from favorites if it's there
        if (isFavorite && artworkMongoId) {
          try {
            await removeFromFavorites(artworkMongoId);
            setIsFavorite(false);
          } catch (error) {
            console.error('Error removing from favorites:', error);
          }
        }

        const artworkData: CulturalItem = {
          id: artwork.id,
          originalId: artwork.originalId,
          source: artwork.source,
          title: artwork.title,
          category: artwork.category,
          imageUrl: artwork.imageUrl,
          creator: artwork.creator,
          year: artwork.year,
          description: artwork.description,
          rating: artwork.rating,
          metadata: artwork.metadata || {}
        };
        const result = await addToPending(artworkData);
        setIsPending(true);
        // If backend returns artworkId, save it (only if we don't have one already)
        if (result.data?.artworkId && !artworkMongoId) {
          setArtworkMongoId(result.data.artworkId);
        }
      }
    } catch (error: any) {
      console.error('Error toggling pending:', error);
      // Revert state in case of error
      setIsPending(!isPending);
    } finally {
      setUpdatingPending(false);
    }
  };

  const getCategoryName = (cat: string) => {
    switch(cat) {
      case 'cine': return 'Cine';
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
  const displayTags = artwork.category === 'musica' && musicTags.length > 0 ? musicTags : artworkTags;
  const displayPlatforms = artwork.category === 'musica' && musicPlatforms.length > 0 ? musicPlatforms : artworkPlatforms;
  const displayOther = artwork.category === 'musica' && musicOther.length > 0 ? musicOther : artworkOther;

  return (
    <BackgroundLayout>
      <SafeAreaView className="flex-1">
        <StatusBar barStyle="light-content" />
        
        {/* Header con botón de volver */}
        <View className="flex-row items-center px-4 py-3 bg-slate-900/50">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Hero Image */}
          <View className="relative">
            <Image 
              source={{ uri: artwork.imageUrl }} 
              style={{ width: '100%', height: 400 }} 
              resizeMode="cover" 
              className="bg-slate-700"
            />
          </View>

          {/* Category Tag - Debajo de la imagen */}
          <View className="px-4 -mt-6 mb-4">
            <View className="bg-slate-700/90 px-4 py-1.5 rounded-full self-start">
              <Text className="text-white text-sm font-medium">
                {getCategoryName(artwork.category)}
              </Text>
            </View>
          </View>

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

            {/* Action Buttons - Favorito y Pendiente */}
            <View className="flex-row gap-3 mb-6">
              <TouchableOpacity
                onPress={handleToggleFavorite}
                disabled={updatingFavorite || !user}
                className={`flex-1 flex-row items-center justify-center gap-2 px-4 py-3 rounded-full ${
                  isFavorite ? 'bg-red-600' : 'bg-slate-700/60'
                } ${updatingFavorite ? 'opacity-50' : ''}`}
              >
                {updatingFavorite ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Heart 
                    size={18} 
                    color="#fff" 
                    fill={isFavorite ? "#fff" : "none"} 
                  />
                )}
                <Text className="text-white font-medium">Favorito</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleTogglePending}
                disabled={updatingPending || !user}
                className={`flex-1 flex-row items-center justify-center gap-2 px-4 py-3 rounded-full ${
                  isPending ? 'bg-yellow-600' : 'bg-slate-700/60'
                } ${updatingPending ? 'opacity-50' : ''}`}
              >
                {updatingPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Clock 
                    size={18} 
                    color="#fff" 
                  />
                )}
                <Text className="text-white font-medium">Pendiente</Text>
              </TouchableOpacity>
            </View>

            {/* Botón para abrir en Spotify (solo para música) */}
            {artwork.category === 'musica' && artwork.metadata?.contextLink && (
              <TouchableOpacity
                onPress={() => Linking.openURL(artwork.metadata.contextLink)}
                className="bg-green-600 rounded-xl p-4 flex-row items-center justify-center gap-2 mb-6"
              >
                <ExternalLink size={20} color="#fff" />
                <Text className="text-white font-semibold text-base">
                  Abrir en Spotify
                </Text>
              </TouchableOpacity>
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
                  <FlatList
                    data={tracks}
                    scrollEnabled={false}
                    keyExtractor={(item, idx) => item.id || `track-${idx}`}
                    renderItem={({ item: track, index: idx }) => {
                      const isPlaying = playingTrackId === track.id;
                      const hasPreview = !!track.preview_url;
                      const trackSpotifyUrl = track.external_urls?.spotify;
                      const minutes = track.duration_ms ? Math.floor(track.duration_ms / 60000) : 0;
                      const seconds = track.duration_ms ? Math.floor((track.duration_ms % 60000) / 1000) : 0;
                      const artistsText = track.artists?.map((a: any) => a.name).join(', ') || 'Artista desconocido';
                      
                      return (
                        <View
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
                            {/* Botón Play/Stop - SIEMPRE visible */}
                            <TouchableOpacity
                              onPress={() => hasPreview && playPreview(track.preview_url, track.id)}
                              disabled={!hasPreview}
                              className={`w-12 h-12 rounded-full items-center justify-center ${
                                hasPreview 
                                  ? (isPlaying ? 'bg-red-600' : 'bg-green-600')
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
                            
                            {/* Botón Link a Spotify */}
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
                    }}
                  />
                ) : (
                  <Text className="text-slate-400 text-sm">
                    No se pudieron cargar las canciones
                  </Text>
                )}
              </View>
            )}

            {/* Description */}
            {artwork.description && (
              <View className="mb-6">
                <Text className="text-xl font-semibold text-white mb-3">
                  Descripción
                </Text>
                <Text className="text-base text-slate-300 leading-6">
                  {artwork.description}
                </Text>
              </View>
            )}

            {/* Categorías separadas para todas las obras */}
            <>
              {/* Géneros */}
              {(displayGenres.length > 0 || (artwork.category === 'musica' && loadingTracks && artwork.metadata?.genres?.length > 0)) && (
                <View className="mb-6">
                  <Text className="text-xl font-semibold text-white mb-3">
                    Géneros
                  </Text>
                  {artwork.category === 'musica' && loadingTracks && displayGenres.length === 0 ? (
                    <View className="py-2">
                      <ActivityIndicator size="small" color="#22c55e" />
                    </View>
                  ) : (
                    <View className="flex-row flex-wrap gap-2">
                      {displayGenres.map((genre: string, idx: number) => (
                        <View 
                          key={idx}
                          className="bg-green-600/30 border border-green-500/50 px-4 py-2 rounded-full"
                        >
                          <Text className="text-sm text-green-300 font-medium">
                            {genre}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Tags */}
              {displayTags.length > 0 && (
                <View className="mb-6">
                  <Text className="text-xl font-semibold text-white mb-3">
                    Tags
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {displayTags.map((tag: string, idx: number) => (
                      <View 
                        key={idx}
                        className="bg-purple-600/30 border border-purple-500/50 px-4 py-2 rounded-full"
                      >
                        <Text className="text-sm text-purple-300 font-medium">
                          {tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Plataformas */}
              {displayPlatforms.length > 0 && (
                <View className="mb-6">
                  <Text className="text-xl font-semibold text-white mb-3">
                    {artwork.category === 'musica' ? 'Sellos Discográficos' : 
                     artwork.category === 'videojuegos' ? 'Plataformas' :
                     artwork.category === 'literatura' ? 'Editores' :
                     artwork.category === 'arte-visual' ? 'Museos/Departamentos' :
                     'Plataformas'}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {displayPlatforms.map((platform: string, idx: number) => (
                      <View 
                        key={idx}
                        className="bg-blue-600/30 border border-blue-500/50 px-4 py-2 rounded-full"
                      >
                        <Text className="text-sm text-blue-300 font-medium">
                          {platform}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Otra información */}
              {displayOther.length > 0 && (
                <View className="mb-6">
                  <Text className="text-xl font-semibold text-white mb-3">
                    Información Adicional
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {displayOther.map((item: string, idx: number) => (
                      <View 
                        key={idx}
                        className="bg-slate-700/60 px-4 py-2 rounded-full"
                      >
                        <Text className="text-sm text-slate-300 font-medium">
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>

            {/* Tags (Etiquetas) */}
            {tags.length > 0 && (
              <View className="mb-6">
                <Text className="text-xl font-semibold text-white mb-3">
                  Etiquetas
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {tags.map((tag: string, idx: number) => (
                    <View 
                      key={idx}
                      className="bg-slate-700/60 px-4 py-2 rounded-full"
                    >
                      <Text className="text-sm text-slate-300 font-medium">
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </BackgroundLayout>
  );
}
