import { useLocalSearchParams, useRouter } from 'expo-router';
import { Brain, Check, Star, User as UserIcon } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '../src/components/BottomNavigation';
import { CulturalGridItem } from '../src/components/cultural/CulturalGridItem';
import { NavigationBar } from '../src/components/NavigationBar';
import { BackgroundLayout } from '../src/components/ui/BackgroundLayout';
import { useAuth } from '../src/contexts/AuthContext';
import {
  AB5C_SUBFACET_ORDER,
  DIMENSION_NAMES,
  orderedDimensionKeys,
  SUBFACET_INFO
} from '../src/constants/oceanTestCopy';
import {
  ArtisticDescriptionPayload,
  fetchPersonalizedFeedCurated,
  generateArtisticDescription,
  getUserTestResults,
  invalidateArtisticDescriptionCache,
} from '@/api/client';
import type { CulturalItem } from '@/types/CulturalItem';

const DIMENSION_ICONS: Record<string, any> = {
  openness: Star,
  conscientiousness: Check,
  extraversion: UserIcon,
  agreeableness: Star,
  neuroticism: Brain
};

/** Cuántas subfacetas mostrar antes del botón "Ver más". */
const SUBFACETS_PREVIEW_COUNT = 3;

function getScoreLabel(score: number): { label: string; description: string } {
  if (score >= 4.2) return { label: 'Alto', description: 'Tienes un nivel muy alto' };
  if (score >= 3.5) return { label: 'Moderado-Alto', description: 'Tienes un nivel moderado-alto' };
  if (score >= 2.5) return { label: 'Moderado', description: 'Tienes un nivel moderado' };
  if (score >= 1.5) return { label: 'Bajo-Moderado', description: 'Tienes un nivel bajo-moderado' };
  return { label: 'Bajo', description: 'Tienes un nivel bajo' };
}

export default function TestResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [selectedDimension, setSelectedDimension] = useState<string>('openness');
  /** Listado largo de subfacetas: preview corto hasta pulsar "Ver más". */
  const [subfacetsShowAll, setSubfacetsShowAll] = useState(false);
  /** Vista principal: puntuaciones del test vs. texto IA del perfil artístico. */
  const [resultsView, setResultsView] = useState<'bigFive' | 'artistic'>('bigFive');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>({});
  const [artisticProfile, setArtisticProfile] = useState<ArtisticDescriptionPayload | null>(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  /** Obras de suggestedWorks (IA), mismas que al inicio del feed Explorar. */
  const [profileWorkItems, setProfileWorkItems] = useState<CulturalItem[]>([]);
  const [profileWorksLoading, setProfileWorksLoading] = useState(false);
  const artisticGenInFlight = useRef(false);

  const suggestedWorksKey = useMemo(() => {
    const w = artisticProfile?.suggestedWorks;
    if (!w?.length) return '';
    return w.map((x) => `${x.category}:${x.title}:${x.creator || ''}`).join('|');
  }, [artisticProfile?.suggestedWorks]);

  const { recItemWidth, recGap } = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    const padding = 16 * 2;
    const gap = 8;
    const itemWidth = (screenWidth - padding - gap * 2) / 3;
    return { recItemWidth: itemWidth, recGap: gap };
  }, []);

  useEffect(() => {
    if (resultsView !== 'artistic' || !suggestedWorksKey || !user?._id) {
      setProfileWorkItems([]);
      setProfileWorksLoading(false);
      return;
    }
    let cancelled = false;
    setProfileWorksLoading(true);
    fetchPersonalizedFeedCurated({ anchorsOnly: true })
      .then((payload) => {
        if (!cancelled) setProfileWorkItems(payload.items || []);
      })
      .catch(() => {
        if (!cancelled) setProfileWorkItems([]);
      })
      .finally(() => {
        if (!cancelled) setProfileWorksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resultsView, suggestedWorksKey, user?._id]);

  const handleRecommendationPress = useCallback(
    (item: CulturalItem) => {
      const itemData = JSON.stringify(item);
      router.push({
        pathname: '/artwork-details',
        params: {
          id: item.id,
          source: item.source,
          originalId: String(item.originalId),
          itemData,
        },
      });
    },
    [router]
  );

  /** force: tras rehacer el test — borra caché local y pide al servidor regenerar descripción y obras sugeridas */
  const generateArtisticDescriptionForUser = useCallback(async (userId: string, force = false) => {
    if (artisticGenInFlight.current) return;
    artisticGenInFlight.current = true;
    if (force) {
      invalidateArtisticDescriptionCache(userId);
      setArtisticProfile(null);
    }
    setGeneratingDescription(true);
    try {
      const description = await generateArtisticDescription(userId, { force });
      setArtisticProfile(description);
    } catch (error: any) {
      console.error('Error generating artistic description:', error);
      setArtisticProfile(null);
    } finally {
      artisticGenInFlight.current = false;
      setGeneratingDescription(false);
    }
  }, []);

  // Load results from params or API
  useEffect(() => {
    const loadResults = async () => {
      // If results are in params, use them
      if (params.results) {
        try {
          const parsedResults = JSON.parse(params.results as string);
          setArtisticProfile(null);
          setResults(parsedResults);
          // Tras completar el test: forzar regeneración de IA (perfil y obras sugeridas)
          if (user?._id) {
            generateArtisticDescriptionForUser(user._id, true);
          }
          return;
        } catch (error) {
          console.error('Error parsing results from params:', error);
        }
      }

      // Otherwise, load from API if user is logged in
      if (user?._id) {
        setLoading(true);
        try {
          const apiResults = await getUserTestResults(user._id);
          // API returns array of results, get the latest one
          if (apiResults && Array.isArray(apiResults) && apiResults.length > 0) {
            const sorted = [...apiResults].sort((a, b) => {
              const ta = new Date(a.updatedAt || a.timestamp || a.createdAt || 0).getTime();
              const tb = new Date(b.updatedAt || b.timestamp || b.createdAt || 0).getTime();
              return tb - ta;
            });
            const latestResult = sorted[0];

            let resultData: any;

            // Formato normalizado desde el backend (GET /ocean/user/:userId)
            if (
              latestResult.dimensions &&
              typeof latestResult.dimensions === 'object' &&
              Object.keys(latestResult.dimensions).length > 0
            ) {
              const hasSubfacets =
                latestResult.subfacets &&
                typeof latestResult.subfacets === 'object' &&
                Object.keys(latestResult.subfacets).length > 0;
              const testType =
                hasSubfacets ? 'deep' : latestResult.testType || 'quick';

              resultData = {
                dimensions: latestResult.dimensions,
                testType,
                timestamp: latestResult.timestamp || latestResult.updatedAt || latestResult.createdAt
              };
              if (hasSubfacets) {
                resultData.subfacets = latestResult.subfacets;
              }
            } else {
              // Legado: scores anidados (total + subfacetas en 0–5)
              const dimensions: Record<string, number> = {};
              const subfacets: Record<string, Record<string, number[]>> = {};

              if (latestResult.scores) {
                Object.keys(latestResult.scores).forEach((dimension) => {
                  const scoreObj = latestResult.scores[dimension];
                  if (scoreObj && typeof scoreObj.total === 'number') {
                    dimensions[dimension] = scoreObj.total;

                    if (scoreObj) {
                      const facetKeys = Object.keys(scoreObj).filter(
                        (key) => key !== 'total' && typeof scoreObj[key] === 'number'
                      );
                      if (facetKeys.length > 0) {
                        subfacets[dimension] = {};
                        facetKeys.forEach((key) => {
                          const normalizedValue = scoreObj[key];
                          const originalValue = ((normalizedValue / 5) * 4) - 2;
                          subfacets[dimension][key] = [originalValue];
                        });
                      }
                    }
                  }
                });
              }

              const hasLegacySubfacets = Object.keys(subfacets).length > 0;
              resultData = {
                dimensions,
                testType: hasLegacySubfacets ? 'deep' : latestResult.testType || 'quick',
                timestamp: latestResult.updatedAt || latestResult.createdAt
              };

              if (hasLegacySubfacets) {
                resultData.subfacets = subfacets;
              }
            }

            setResults(resultData);
            setArtisticProfile(null);

            if (user._id) {
              generateArtisticDescriptionForUser(user._id, false);
            }
          } else if (apiResults && !Array.isArray(apiResults) && apiResults.scores) {
            // Single result object with scores
            const dimensions: Record<string, number> = {};
            const subfacets: Record<string, Record<string, number[]>> = {};
            
            Object.keys(apiResults.scores).forEach((dimension) => {
              const scoreObj = apiResults.scores[dimension];
              if (scoreObj && typeof scoreObj.total === 'number') {
                dimensions[dimension] = scoreObj.total;

                if (scoreObj) {
                  const facetKeys = Object.keys(scoreObj).filter(
                    (key) => key !== 'total' && typeof scoreObj[key] === 'number'
                  );
                  if (facetKeys.length > 0) {
                    subfacets[dimension] = {};
                    facetKeys.forEach((key) => {
                      const normalizedValue = scoreObj[key];
                      const originalValue = ((normalizedValue / 5) * 4) - 2;
                      subfacets[dimension][key] = [originalValue];
                    });
                  }
                }
              }
            });

            const hasSingleSubfacets = Object.keys(subfacets).length > 0;
            const resultData: any = {
              dimensions,
              testType: hasSingleSubfacets ? 'deep' : apiResults.testType || 'quick',
              timestamp: apiResults.updatedAt || apiResults.createdAt
            };

            if (hasSingleSubfacets) {
              resultData.subfacets = subfacets;
            }
            
            setResults(resultData);
            setArtisticProfile(null);

            if (user._id) {
              generateArtisticDescriptionForUser(user._id, false);
            }
          } else {
            Alert.alert('Sin resultados', 'No se encontraron resultados del test.');
            router.back();
          }
        } catch (error: any) {
          console.error('Error loading test results:', error);
          Alert.alert('Error', 'No se pudieron cargar los resultados del test.');
          router.back();
        } finally {
          setLoading(false);
        }
      }
    };

    loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.results, user?._id]); // Removed generateArtisticDescriptionForUser and router from dependencies

  useEffect(() => {
    setSubfacetsShowAll(false);
  }, [selectedDimension]);

  // Scores already come in 0-5 scale
  const normalizedDimensions: Record<string, number> = results.dimensions || {};
  const dimensionKeysInOrder = orderedDimensionKeys(normalizedDimensions);

  const isDeep = results.testType === 'deep';

  if (loading) {
    return (
      <BackgroundLayout>
        <SafeAreaView className="flex-1">
          <StatusBar barStyle="light-content" />
          <NavigationBar variant="simple" showAuth={false} showLogout={false} />
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#c084fc" />
            <Text className="mt-4 text-slate-400">Cargando resultados...</Text>
          </View>
        </SafeAreaView>
      </BackgroundLayout>
    );
  }

  if (!results || Object.keys(results).length === 0) {
    return (
      <BackgroundLayout>
        <SafeAreaView className="flex-1">
          <StatusBar barStyle="light-content" />
          <NavigationBar variant="simple" showAuth={false} showLogout={false} />
          <View className="flex-1 justify-center items-center px-4">
            <Brain size={64} color="#64748b" />
            <Text className="text-white text-xl font-bold mt-6 mb-2 text-center">
              Sin resultados
            </Text>
            <Text className="text-slate-400 text-center mb-6">
              No se encontraron resultados del test.
            </Text>
            <TouchableOpacity 
              onPress={() => router.back()}
              className="bg-purple-600 px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold">Volver</Text>
            </TouchableOpacity>
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
          <View className="mx-4 mt-6">
            {/* Title Section */}
            <View className="flex-row items-center gap-3 mb-4">
              <Brain size={32} color="#a855f7" />
              <Text className="text-3xl font-bold text-white">Tus Resultados</Text>
            </View>

            {/* Test Type Buttons */}
            <View className="mb-4 flex-row gap-3">
              <TouchableOpacity 
                className={`rounded-xl px-4 py-2 ${results.testType === 'quick' ? 'bg-purple-600' : 'bg-slate-700/50'}`}
              >
                <Text className="font-medium text-white">
                  {results.testType === 'quick' ? 'Descubrimiento Rápido' : 'Análisis Profundo'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Conmutador: por defecto Big Five; perfil artístico aparte */}
            <View className="mb-6 flex-row rounded-xl border border-slate-700/60 bg-slate-900/70 p-1">
              <TouchableOpacity
                onPress={() => setResultsView('bigFive')}
                className={`flex-1 items-center rounded-lg py-3 ${
                  resultsView === 'bigFive' ? 'bg-purple-600' : ''
                }`}
              >
                <Text
                  className={`text-center text-sm font-semibold ${
                    resultsView === 'bigFive' ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  Big Five
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setResultsView('artistic')}
                className={`flex-1 items-center rounded-lg py-3 ${
                  resultsView === 'artistic' ? 'bg-purple-600' : ''
                }`}
              >
                <Text
                  className={`text-center text-sm font-semibold ${
                    resultsView === 'artistic' ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  Perfil artístico
                </Text>
              </TouchableOpacity>
            </View>

            {resultsView === 'artistic' && (
            <View className="mb-6 rounded-2xl border border-slate-700/50 bg-slate-800/90 p-6 shadow-xl">
              <View className="mb-3 flex-row items-center gap-2">
                <Text className="text-xl font-bold text-white">Tu Perfil Artístico</Text>
                {generatingDescription && (
                  <ActivityIndicator size="small" color="#a855f7" />
                )}
                {artisticProfile && (
                  <View className="rounded bg-purple-500/20 px-2 py-1">
                    <Text className="text-xs font-semibold text-purple-400">IA</Text>
                  </View>
                )}
              </View>
              {generatingDescription && !artisticProfile ? (
                <View className="items-center py-4">
                  <ActivityIndicator size="large" color="#a855f7" />
                  <Text className="mt-2 text-slate-400">Generando descripción personalizada...</Text>
                </View>
              ) : artisticProfile ? (
                <>
                  {artisticProfile.profile ? (
                    <Text className="mb-2 text-lg font-semibold text-purple-200">
                      {artisticProfile.profile}
                    </Text>
                  ) : null}
                  <Text className="mb-4 leading-6 text-slate-300">{artisticProfile.description}</Text>
                  {artisticProfile.recommendations && artisticProfile.recommendations.length > 0 && (
                    <View className="mb-5">
                      <Text className="mb-2 text-sm text-slate-400">Te recomendamos:</Text>
                      <Text className="text-slate-300">{artisticProfile.recommendations.join(', ')}.</Text>
                    </View>
                  )}

                  {(profileWorksLoading ||
                    !!suggestedWorksKey ||
                    profileWorkItems.length > 0) && (
                    <View className="mt-5 border-t border-slate-700/60 pt-4">
                      <Text className="mb-1 text-sm font-semibold text-white">
                        Obras recomendadas para ti
                      </Text>
                      <Text className="mb-3 text-xs text-slate-500">
                        Son las que ves al inicio en Explorar; allí se añade más variedad a partir del mismo perfil.
                      </Text>
                      {profileWorksLoading ? (
                        <View className="items-center py-4">
                          <ActivityIndicator color="#a855f7" />
                          <Text className="mt-2 text-xs text-slate-500">Resolviendo obras…</Text>
                        </View>
                      ) : profileWorkItems.length > 0 ? (
                        <View className="flex-row flex-wrap">
                          {profileWorkItems.map((item, index) => (
                            <CulturalGridItem
                              key={item.id}
                              item={item}
                              itemWidth={recItemWidth}
                              gap={recGap}
                              index={index}
                              onPress={handleRecommendationPress}
                            />
                          ))}
                        </View>
                      ) : suggestedWorksKey ? (
                        <Text className="text-xs leading-5 text-slate-500">
                          No encontramos coincidencias en las APIs para estas obras. Prueba en Explorar más tarde.
                        </Text>
                      ) : null}
                    </View>
                  )}
                </>
              ) : (
                <Text className="leading-6 text-slate-400">
                  {user?._id
                    ? 'No se pudo generar la descripción personalizada en este momento. Vuelve a intentar más tarde o revisa tus puntuaciones en Big Five.'
                    : 'Inicia sesión para obtener una descripción personalizada basada en tus resultados. Mientras tanto puedes revisar tus puntuaciones en Big Five.'}
                </Text>
              )}
            </View>
            )}

            {resultsView === 'bigFive' && (
            <View className="mb-6 rounded-2xl border border-slate-700/50 bg-slate-800/90 p-6 shadow-xl">
              <Text className="mb-1 text-xl font-bold text-white">Los Big Five</Text>
              <Text className="mb-5 text-xs text-slate-500">
                Escala 0–5. Barras por rasgo; más abajo elige un rasgo para leer el detalle y las facetas.
              </Text>
              <View className="gap-5">
                {dimensionKeysInOrder.map((key) => {
                  const score = normalizedDimensions[key];
                  const dimInfo = DIMENSION_NAMES[key];
                  if (dimInfo === undefined) return null;
                  const pct = Math.min(100, Math.max(0, (score / 5) * 100));
                  return (
                    <View key={key}>
                      <View className="flex-row items-stretch gap-3">
                        <View
                          className="w-1.5 rounded-full"
                          style={{ backgroundColor: dimInfo.color, width: 6 }}
                        />
                        <View className="min-w-0 flex-1">
                          <View className="flex-row items-baseline justify-between gap-2">
                            <Text className="flex-1 text-[15px] font-medium leading-snug text-slate-100">
                              {dimInfo.es}
                            </Text>
                            <Text className="shrink-0 text-lg font-bold tabular-nums text-white">
                              {score.toFixed(1)}
                            </Text>
                          </View>
                          <View className="mt-2.5 h-4 overflow-hidden rounded-full bg-slate-700/85">
                            <View
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: dimInfo.color,
                                minWidth: pct > 0 ? 6 : 0
                              }}
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              <View className="mt-8 border-t border-slate-700/60 pt-6">
                <View className="mb-6 flex-row gap-1">
                  {dimensionKeysInOrder.map((key) => {
                    const dimInfo = DIMENSION_NAMES[key];
                    if (dimInfo === undefined) return null;
                    const Icon = DIMENSION_ICONS[key] || Star;
                    const isSelected = selectedDimension === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        onPress={() => setSelectedDimension(key)}
                        className={`min-w-0 flex-1 items-center justify-center rounded-lg py-2 px-0.5 ${
                          isSelected ? 'bg-purple-600' : 'bg-slate-700/50'
                        }`}
                      >
                        <Icon size={17} color={isSelected ? 'white' : '#94a3b8'} />
                        <Text
                          className={`mt-1 text-center text-[9px] leading-[11px] ${
                            isSelected ? 'text-white' : 'text-slate-400'
                          }`}
                          numberOfLines={3}
                        >
                          {dimInfo.es}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

              {/* Selected Dimension Details */}
              {selectedDimension && normalizedDimensions[selectedDimension] !== undefined && (
                <View>
                  <View className="flex-row items-center gap-2 mb-4">
                    <Star size={24} color={DIMENSION_NAMES[selectedDimension].color} />
                    <Text className="text-xl font-bold text-white">
                      {DIMENSION_NAMES[selectedDimension].es}
                    </Text>
                  </View>
                  
                  <Text className="text-slate-300 mb-4 leading-6">
                    {DIMENSION_NAMES[selectedDimension].descripcion}
                  </Text>
              

                  {/* Puntuación del rasgo  */}
                  {(() => {
                    const scoreVal = normalizedDimensions[selectedDimension];
                    const dim = DIMENSION_NAMES[selectedDimension];
                    const scoreLabel = getScoreLabel(scoreVal);
                    return (
                      <View
                        className="mb-2 overflow-hidden rounded-xl border border-slate-600/35 bg-slate-900/45"
                        style={{ borderLeftWidth: 4, borderLeftColor: dim.color }}
                      >
                        <View className="flex-row items-center gap-4 p-4">
                          <View>
                            <Text className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                              Puntuación
                            </Text>
                            <Text className="text-3xl font-bold text-white">
                              {scoreVal.toFixed(1)}
                              <Text className="text-lg font-semibold text-slate-500">/5</Text>
                            </Text>
                          </View>
                          <View className="min-w-0 flex-1 border-l border-slate-600/50 pl-4">
                            <View className="mb-1.5 self-start rounded-md bg-slate-800/90 px-2.5 py-1">
                              <Text className="text-xs font-semibold" style={{ color: dim.color }}>
                                {scoreLabel.label}
                              </Text>
                            </View>
                            <Text className="text-sm leading-5 text-slate-300">
                              {scoreLabel.description} en {dim.es.toLowerCase()}.
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Subfacets (only for deep test): preview + "Ver más" */}
                  {isDeep && results.subfacets && results.subfacets[selectedDimension] && (
                    <View className="rounded-xl border border-slate-600/40 bg-slate-900/40 p-4">
                      <Text className="text-white font-semibold text-base mb-1">Facetas AB5C</Text>
                      <Text className="text-slate-500 text-xs mb-3 leading-5">
                        Cada tarjeta es una subfaceta del modelo IPIP (AB5C). La barra resume tu puntuación en 0–5.
                      </Text>
                      {(() => {
                        const order = AB5C_SUBFACET_ORDER[selectedDimension] || [];
                        const entries = Object.entries(results.subfacets[selectedDimension] as Record<string, number[]>);
                        const sorted = [...entries].sort(([a], [b]) => {
                          const ia = order.indexOf(a);
                          const ib = order.indexOf(b);
                          if (ia === -1 && ib === -1) return a.localeCompare(b);
                          if (ia === -1) return 1;
                          if (ib === -1) return -1;
                          return ia - ib;
                        });
                        const dimColor = DIMENSION_NAMES[selectedDimension].color;
                        const total = sorted.length;
                        const hasMore = total > SUBFACETS_PREVIEW_COUNT;
                        const visible = subfacetsShowAll
                          ? sorted
                          : sorted.slice(0, SUBFACETS_PREVIEW_COUNT);
                        const restCount = total - SUBFACETS_PREVIEW_COUNT;

                        return (
                          <>
                            <View className="gap-1">
                              {visible.map(([subfacet, scores]: [string, number[]]) => {
                                const average =
                                  scores.reduce((sum: number, val: number) => sum + val, 0) / scores.length;
                                const normalizedScore = ((average + 2) / 4) * 5;
                                const info = SUBFACET_INFO[subfacet];
                                const subfacetName = info?.label ?? subfacet;
                                const subfacetDesc = info?.descripcion;
                                const pct = (normalizedScore / 5) * 100;

                                return (
                                  <View
                                    key={subfacet}
                                    className="overflow-hidden rounded-xl border border-slate-600/35 bg-slate-800/60"
                                  >
                                    <View
                                      className="flex-row"
                                      style={{ borderLeftWidth: 4, borderLeftColor: dimColor }}
                                    >
                                      <View className="flex-1 p-3">
                                        <View className="flex-row items-start justify-between gap-2">
                                          <View className="min-w-0 flex-1 pr-1">
                                            <Text className="text-base font-semibold leading-snug text-white">
                                              {subfacetName}
                                            </Text>
                                            {subfacetDesc ? (
                                              <Text className="mt-1.5 text-xs leading-5 text-slate-400">
                                                {subfacetDesc}
                                              </Text>
                                            ) : null}
                                          </View>
                                          <View className="shrink-0 items-end rounded-lg border border-slate-600/50 bg-slate-900/80 px-2 py-1.5">
                                            <Text className="text-lg font-bold leading-none text-white">
                                              {normalizedScore.toFixed(1)}
                                            </Text>
                                            <Text className="text-[10px] text-slate-500">de 5</Text>
                                          </View>
                                        </View>
                                        <View className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-700/90">
                                          <View
                                            className="h-full rounded-full"
                                            style={{
                                              width: `${pct}%`,
                                              backgroundColor: dimColor
                                            }}
                                          />
                                        </View>
                                      </View>
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                            {hasMore ? (
                              <TouchableOpacity
                                className="mt-2 rounded-xl border border-slate-600/60 bg-slate-800/70 py-3.5"
                                onPress={() => setSubfacetsShowAll((v) => !v)}
                                activeOpacity={0.75}
                              >
                                <Text className="text-center text-sm font-semibold text-purple-300">
                                  {subfacetsShowAll
                                    ? 'Mostrar menos'
                                    : `Ver ${restCount} ${restCount === 1 ? 'faceta más' : 'facetas más'}`}
                                </Text>
                              </TouchableOpacity>
                            ) : null}
                          </>
                        );
                      })()}
                    </View>
                  )}

                  {!isDeep && (
                    <View className="mt-4 p-4 bg-slate-700/50 rounded-xl">
                      <Text className="text-slate-300 text-sm">
                        Realiza el <Text className="font-bold underline">Análisis Profundo</Text> para ver las{' '}
                        {AB5C_SUBFACET_ORDER.openness.length} facetas AB5C por rasgo (modelo IPIP).
                      </Text>
                    </View>
                  )}
                </View>
              )}
              </View>
            </View>
            )}

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-slate-700 rounded-xl py-4 items-center"
                onPress={() => router.replace('/test-selection')}
              >
                <Text className="text-white font-semibold">Rehacer test</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-1 bg-purple-600 rounded-xl py-4 items-center"
                onPress={() => router.replace('/FeedScreen')}
              >
                <Text className="text-white font-semibold">Explorar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        <BottomNavigation />
      </SafeAreaView>
    </BackgroundLayout>
  );
}
