import { useLocalSearchParams, useRouter } from 'expo-router';
import { Brain, Check, Star, User as UserIcon } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ArtisticDescriptionPayload,
  generateArtisticDescription,
  getUserTestResults,
  invalidateArtisticDescriptionCache,
} from '@/api/client';
import { BottomNavigation } from '../src/components/BottomNavigation';
import { NavigationBar } from '../src/components/NavigationBar';
import { DimensionSelectorTabs } from '../src/components/test-results/DimensionSelectorTabs';
import { GenreRecommendationsBlock } from '../src/components/test-results/GenreRecommendationsBlock';
import { SelectedDimensionDetailsBlock } from '../src/components/test-results/SelectedDimensionDetailsBlock';
import { BackgroundLayout } from '../src/components/ui/BackgroundLayout';
import {
  DIMENSION_NAMES,
  orderedDimensionKeys,
} from '../src/constants/oceanTestCopy';
import { useAuth } from '../src/contexts/AuthContext';

const DIMENSION_ICONS: Record<string, any> = {
  openness: Star,
  conscientiousness: Check,
  extraversion: UserIcon,
  agreeableness: Star,
  neuroticism: Brain
};

function getScoreLabel(score: number): { label: string; description: string } {
  if (score >= 4.2) return { label: 'Alto', description: 'Tienes un nivel muy alto' };
  if (score >= 3.5) return { label: 'Moderado-Alto', description: 'Tienes un nivel moderado-alto' };
  if (score >= 2.5) return { label: 'Moderado', description: 'Tienes un nivel moderado' };
  if (score >= 1.5) return { label: 'Bajo-Moderado', description: 'Tienes un nivel bajo-moderado' };
  return { label: 'Bajo', description: 'Tienes un nivel bajo' };
}

function normalizeLegacyScores(scores: any) {
  const dimensions: Record<string, number> = {};
  const subfacets: Record<string, Record<string, number[]>> = {};

  if (!scores || typeof scores !== 'object') {
    return { dimensions, subfacets };
  }

  Object.keys(scores).forEach((dimension) => {
    const scoreObj = scores[dimension];
    if (!scoreObj || typeof scoreObj.total !== 'number') return;

    dimensions[dimension] = scoreObj.total;
    const facetKeys = Object.keys(scoreObj).filter(
      (key) => key !== 'total' && typeof scoreObj[key] === 'number'
    );

    if (!facetKeys.length) return;

    subfacets[dimension] = {};
    facetKeys.forEach((key) => {
      const normalizedValue = scoreObj[key];
      const originalValue = ((normalizedValue / 5) * 4) - 2;
      subfacets[dimension][key] = [originalValue];
    });
  });

  return { dimensions, subfacets };
}

function normalizeTestResult(rawResult: any) {
  if (
    rawResult?.dimensions &&
    typeof rawResult.dimensions === 'object' &&
    Object.keys(rawResult.dimensions).length > 0
  ) {
    const hasSubfacets =
      rawResult.subfacets &&
      typeof rawResult.subfacets === 'object' &&
      Object.keys(rawResult.subfacets).length > 0;
    const normalized: any = {
      dimensions: rawResult.dimensions,
      testType: hasSubfacets ? 'deep' : rawResult.testType || 'quick',
      timestamp: rawResult.timestamp || rawResult.updatedAt || rawResult.createdAt
    };
    if (hasSubfacets) normalized.subfacets = rawResult.subfacets;
    return normalized;
  }

  const { dimensions, subfacets } = normalizeLegacyScores(rawResult?.scores);
  const hasLegacySubfacets = Object.keys(subfacets).length > 0;
  const normalized: any = {
    dimensions,
    testType: hasLegacySubfacets ? 'deep' : rawResult?.testType || 'quick',
    timestamp: rawResult?.timestamp || rawResult?.updatedAt || rawResult?.createdAt
  };
  if (hasLegacySubfacets) normalized.subfacets = subfacets;
  return normalized;
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
  const artisticGenInFlight = useRef(false);

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
            const resultData = normalizeTestResult(latestResult);

            setResults(resultData);
            setArtisticProfile(null);

            if (user._id) {
              generateArtisticDescriptionForUser(user._id, false);
            }
          } else if (apiResults && !Array.isArray(apiResults) && apiResults.scores) {
            const resultData = normalizeTestResult(apiResults);
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
                  <GenreRecommendationsBlock artisticProfile={artisticProfile} />
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
                <DimensionSelectorTabs
                  dimensionKeysInOrder={dimensionKeysInOrder}
                  selectedDimension={selectedDimension}
                  setSelectedDimension={setSelectedDimension}
                  dimensionIcons={DIMENSION_ICONS}
                />

              <SelectedDimensionDetailsBlock
                selectedDimension={selectedDimension}
                normalizedDimensions={normalizedDimensions}
                isDeep={isDeep}
                subfacets={results.subfacets}
                subfacetsShowAll={subfacetsShowAll}
                setSubfacetsShowAll={setSubfacetsShowAll}
                getScoreLabel={getScoreLabel}
              />
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
