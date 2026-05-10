import { useLocalSearchParams, useRouter } from 'expo-router';
import { Brain, Check, Sparkles, Star, User as UserIcon } from 'lucide-react-native';
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
import { LinearGradient } from 'expo-linear-gradient';

import {
  ArtisticDescriptionPayload,
  generateArtisticDescription,
  getUserTestResults,
  invalidateArtisticDescriptionCache,
} from '@/api/client';
import { BottomNavigation } from '../src/components/BottomNavigation';
import { NavigationBar } from '../src/components/NavigationBar';
import { DimensionSelectorTabs } from '../src/components/test-results/DimensionSelectorTabs';
import { SelectedDimensionDetailsBlock } from '../src/components/test-results/SelectedDimensionDetailsBlock';
import { BackgroundLayout } from '../src/components/ui/BackgroundLayout';
import {
  DIMENSION_NAMES,
  orderedDimensionKeys,
} from '../src/constants/oceanTestCopy';
import {
  OCEAN_RESPONSE_SCALE,
  OCEAN_SCORE_METRIC,
  affineStored05ToLikertMean,
  likertMeanToBarPercent,
  type OceanScoreMetric,
} from '../src/utils/oceanScoring';
import { useAuth } from '../src/contexts/AuthContext';

const DIMENSION_ICONS: Record<string, any> = {
  openness: Star,
  conscientiousness: Check,
  extraversion: UserIcon,
  agreeableness: Star,
  neuroticism: Brain
};

/** Rangos cualitativos sobre media Likert 1–5 (IPIP / Mini-IPIP). */
function getScoreLabel(score: number): { label: string; description: string } {
  if (score >= 4.25) return { label: 'Alto', description: 'Tienes una media alta en este rasgo' };
  if (score >= 3.55) return { label: 'Moderado-Alto', description: 'Tienes una media moderadamente alta' };
  if (score >= 2.75) return { label: 'Moderado', description: 'Tienes una media cercana al punto medio del 1–5' };
  if (score >= 2.05) return { label: 'Bajo-Moderado', description: 'Tienes una media moderadamente baja' };
  return { label: 'Bajo', description: 'Tienes una media baja en este rasgo' };
}

function normalizeLegacyScores(scores: any, scoreMetric: OceanScoreMetric) {
  const dimensions: Record<string, number> = {};
  const subfacets: Record<string, Record<string, number[]>> = {};

  if (!scores || typeof scores !== 'object') {
    return { dimensions, subfacets };
  }

  Object.keys(scores).forEach((dimension) => {
    const scoreObj = scores[dimension];
    if (!scoreObj || typeof scoreObj.total !== 'number') return;

    dimensions[dimension] =
      scoreMetric === OCEAN_SCORE_METRIC.IPIP_MEAN_1_5
        ? scoreObj.total
        : affineStored05ToLikertMean(scoreObj.total);
    const facetKeys = Object.keys(scoreObj).filter(
      (key) => key !== 'total' && typeof scoreObj[key] === 'number'
    );

    if (!facetKeys.length) return;

    subfacets[dimension] = {};
    facetKeys.forEach((key) => {
      const stored = scoreObj[key];
      const likertFacet =
        scoreMetric === OCEAN_SCORE_METRIC.IPIP_MEAN_1_5
          ? stored
          : affineStored05ToLikertMean(stored);
      subfacets[dimension][key] = [likertFacet];
    });
  });

  return { dimensions, subfacets };
}

/** Parte el texto del modelo en bloques legibles (párrafos o frases largas). */
function splitArtisticDescriptionText(text: string): string[] {
  const trimmed = text?.trim();
  if (!trimmed) return [];

  const byParagraphs = trimmed.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  if (byParagraphs.length > 1) {
    return byParagraphs.flatMap((p) => chunkLongParagraph(p));
  }

  const lines = trimmed.split(/\n/).map((s) => s.trim()).filter(Boolean);
  if (lines.length > 1) {
    return lines.flatMap((p) => chunkLongParagraph(p));
  }

  return chunkLongParagraph(trimmed);
}

function chunkLongParagraph(text: string, maxLen = 420): string[] {
  if (text.length <= maxLen) return [text];

  const sentences = text.split(/(?<=[.!?¿¡])\s+/).filter(Boolean);
  if (sentences.length <= 1) return [text];

  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    const next = cur ? `${cur} ${s}` : s;
    if (next.length > maxLen && cur) {
      chunks.push(cur.trim());
      cur = s;
    } else {
      cur = next;
    }
  }
  if (cur) chunks.push(cur.trim());
  return chunks.length ? chunks : [text];
}

function isBulletLine(line: string): boolean {
  return /^\s*([•*-]|\d+[.)])\s/.test(line);
}

function stripBulletPrefix(line: string): string {
  return line.replace(/^\s*([•*-]|\d+[.)])\s*/, '').trim();
}

function ArtisticDescriptionBody({ description }: { description: string }) {
  const blocks = splitArtisticDescriptionText(description ?? '');
  if (!blocks.length) return null;
  return (
    <>
      {blocks.map((block, blockIndex) => {
        const lines = block.includes('\n')
          ? block.split(/\n/).map((l) => l.trim()).filter(Boolean)
          : [block];

        const hasBullets = lines.length > 1 && lines.some(isBulletLine);
        if (hasBullets) {
          return (
            <View key={`b-${blockIndex}`} className="mb-5 gap-2.5">
              {lines.map((line, j) =>
                isBulletLine(line) ? (
                  <View key={j} className="flex-row gap-3 pl-0.5">
                    <Text className="pt-0.5 text-base text-purple-400">•</Text>
                    <Text className="min-w-0 flex-1 text-[15px] leading-[24px] text-slate-200">
                      {stripBulletPrefix(line)}
                    </Text>
                  </View>
                ) : (
                  <Text key={j} className="text-[15px] leading-[24px] text-slate-200">
                    {line}
                  </Text>
                )
              )}
            </View>
          );
        }

        return (
          <Text
            key={`b-${blockIndex}`}
            className="mb-5 text-[15px] leading-[24px] text-slate-200"
          >
            {block}
          </Text>
        );
      })}
    </>
  );
}

function normalizeTestResult(rawResult: any) {
  const responseScale =
    rawResult?.responseScale === OCEAN_RESPONSE_SCALE.IPIP_1_5
      ? OCEAN_RESPONSE_SCALE.IPIP_1_5
      : OCEAN_RESPONSE_SCALE.LEGACY_NEG2_POS2;
  const scoreMetric: OceanScoreMetric =
    rawResult?.scoreMetric === OCEAN_SCORE_METRIC.IPIP_MEAN_1_5
      ? OCEAN_SCORE_METRIC.IPIP_MEAN_1_5
      : OCEAN_SCORE_METRIC.DISPLAY_AFFINE_05;

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
      timestamp: rawResult.timestamp || rawResult.updatedAt || rawResult.createdAt,
      responseScale,
      scoreMetric,
    };
    if (hasSubfacets) normalized.subfacets = rawResult.subfacets;
    return normalized;
  }

  const { dimensions, subfacets } = normalizeLegacyScores(rawResult?.scores, scoreMetric);
  const hasLegacySubfacets = Object.keys(subfacets).length > 0;
  const normalized: any = {
    dimensions,
    testType: hasLegacySubfacets ? 'deep' : rawResult?.testType || 'quick',
    timestamp: rawResult?.timestamp || rawResult?.updatedAt || rawResult?.createdAt,
    responseScale,
    scoreMetric,
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
  /** Vista principal: puntuaciones del test vs. tu análisis de personalidad. */
  const [resultsView, setResultsView] = useState<'bigFive' | 'artistic'>('bigFive');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>({});
  const [artisticProfile, setArtisticProfile] = useState<ArtisticDescriptionPayload | null>(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const artisticGenInFlight = useRef(false);

  /**
   * Obtiene/genera tu análisis de personalidad. El servidor solo llama al modelo cuando no hay análisis guardado
   * para el resultado actual del test (p. ej. tras guardar o rehacer el test — saveTestResults lo borra).
   * force: solo para una acción explícita "regenerar" (elimina el guardado en servidor); no usar tras cada entrada con params.
   */
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
          const parsedResults = normalizeTestResult(JSON.parse(params.results as string));
          setArtisticProfile(null);
          setResults(parsedResults);
          // Tras guardar el test en servidor: forzar regeneración de análisis + invalidación de feed en API (forceRegenerate).
          if (user?._id) {
            const forceRegenerate = String(params.regenerateProfile || '') === '1';
            generateArtisticDescriptionForUser(user._id, forceRegenerate);
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

            {/* Conmutador: por defecto Big Five; análisis de personalidad aparte */}
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
                  Análisis de personalidad
                </Text>
              </TouchableOpacity>
            </View>

            {resultsView === 'artistic' && (
            <View className="mb-6 overflow-hidden rounded-2xl border border-purple-500/20 bg-slate-900/80 shadow-xl">
              <View className="border-b border-white/10 bg-violet-950/55 px-5 py-4">
                <View className="flex-row items-center gap-3">
                  <LinearGradient
                    colors={['#7c3aed', '#9333ea']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="h-11 w-11 items-center justify-center rounded-xl"
                  >
                    <Sparkles size={22} color="#faf5ff" />
                  </LinearGradient>
                  <View className="min-w-0 flex-1">
                    <View className="mb-1 flex-row flex-wrap items-center gap-2">
                      {generatingDescription && (
                        <ActivityIndicator size="small" color="#c4b5fd" />
                      )}
                      {artisticProfile ? (
                        <View className="rounded-full border border-purple-400/40 bg-purple-500/25 px-2.5 py-1">
                          <Text className="text-[11px] font-bold tracking-wide text-purple-100">
                            IA
                          </Text>
                        </View>
                      ) : null}
                      <Text className="text-base font-semibold tracking-tight text-white">
                        Análisis de personalidad
                      </Text>
                    </View>
                    <Text className="text-xs leading-4 text-violet-200/85">
                      Generado a partir de tus puntuaciones; puedes usarlo como guía, no como verdad absoluta.
                    </Text>
                  </View>
                </View>
              </View>

              <View className="px-5 pb-6 pt-5">
                {generatingDescription && !artisticProfile ? (
                  <View className="items-center py-6">
                    <ActivityIndicator size="large" color="#a855f7" />
                    <Text className="mt-3 text-center text-[15px] text-slate-400">
                      Generando descripción personalizada...
                    </Text>
                  </View>
                ) : artisticProfile ? (
                  <>
                    {artisticProfile.profile ? (
                      <Text className="mb-5 text-xl font-bold leading-7 text-purple-100">
                        {artisticProfile.profile}
                      </Text>
                    ) : null}
                    <ArtisticDescriptionBody description={artisticProfile.description} />
                  </>
                ) : (
                  <Text className="text-[15px] leading-6 text-slate-400">
                    {user?._id
                      ? 'No se pudo generar la descripción personalizada en este momento. Vuelve a intentar más tarde o revisa tus puntuaciones en Big Five.'
                      : 'Inicia sesión para obtener una descripción personalizada basada en tus resultados. Mientras tanto puedes revisar tus puntuaciones en Big Five.'}
                  </Text>
                )}
              </View>
            </View>
            )}

            {resultsView === 'bigFive' && (
            <View className="mb-6 rounded-2xl border border-slate-700/50 bg-slate-800/90 p-6 shadow-xl">
              <Text className="mb-1 text-xl font-bold text-white">Los Big Five</Text>
              <Text className="mb-5 text-xs text-slate-500">
                Media Likert 1–5 por rasgo (ítems recodificados al estilo IPIP). Elige un rasgo abajo para facetas AB5C.
              </Text>
              <View className="gap-5">
                {dimensionKeysInOrder.map((key) => {
                  const score = normalizedDimensions[key];
                  const dimInfo = DIMENSION_NAMES[key];
                  if (dimInfo === undefined) return null;
                  const pct = likertMeanToBarPercent(score);
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
                              {score.toFixed(2)}
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
