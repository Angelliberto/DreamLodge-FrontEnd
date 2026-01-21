import { useLocalSearchParams, useRouter } from 'expo-router';
import { Brain, Check, Copy, Home, MessageCircle, Star, User, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Clipboard,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LinearGradient } from 'expo-linear-gradient';
import { BackgroundLayout } from '../src/components/ui/BackgroundLayout';

const DIMENSION_NAMES: Record<string, { es: string; color: string }> = {
  openness: { es: 'Apertura a experiencias', color: '#ec4899' },
  conscientiousness: { es: 'Meticulosidad', color: '#22c55e' },
  extraversion: { es: 'Extroversión', color: '#3b82f6' },
  agreeableness: { es: 'Simpatía', color: '#f97316' },
  neuroticism: { es: 'Neurosis', color: '#a855f7' }
};

const DIMENSION_ICONS: Record<string, any> = {
  openness: Star,
  conscientiousness: Check,
  extraversion: User,
  agreeableness: Star,
  neuroticism: Brain
};

const SUBFACET_NAMES: Record<string, string> = {
  imagination: 'Imaginación',
  artistic_interests: 'Intereses Artísticos',
  emotionality: 'Emocionalidad',
  adventurousness: 'Aventura',
  intellect: 'Intelecto'
};

function getProfileDescription(dimensions: Record<string, number>): { profile: string; description: string; recommendations: string[] } {
  const openness = (dimensions.openness || 0) / 20; // Convertir de 0-100 a 0-5
  const extraversion = (dimensions.extraversion || 0) / 20;
  const neuroticism = (dimensions.neuroticism || 0) / 20;

  if (openness > 4 && neuroticism > 3.5) {
    return {
      profile: 'Existencial',
      description: 'Buscas obras que exploren las grandes preguntas sobre la existencia, identidad y el sentido de la vida. Te atraen las experiencias que desafían tu perspectiva.',
      recommendations: ['cine de autor', 'música experimental', 'literatura existencialista', 'arte conceptual', 'juegos filosóficos']
    };
  } else if (openness > 3.5 && extraversion < 2) {
    return {
      profile: 'Contemplativo',
      description: 'Disfrutas de obras que invitan a la reflexión pausada y la introspección profunda. Prefieres experiencias artísticas que te permitan procesar ideas con calma.',
      recommendations: ['cine contemplativo', 'música ambient', 'literatura filosófica', 'arte minimalista', 'juegos narrativos lentos']
    };
  } else if (openness > 4) {
    return {
      profile: 'Explorador',
      description: 'Te encanta descubrir nuevas formas de expresión artística y experimentar con estilos innovadores. Buscas constantemente experiencias que amplíen tus horizontes.',
      recommendations: ['cine independiente', 'música alternativa', 'literatura experimental', 'arte contemporáneo', 'juegos indie']
    };
  } else {
    return {
      profile: 'Equilibrado',
      description: 'Tienes un perfil artístico balanceado que aprecia tanto lo clásico como lo moderno. Disfrutas de una amplia variedad de experiencias culturales.',
      recommendations: ['cine clásico y moderno', 'música variada', 'literatura diversa', 'arte tradicional y contemporáneo', 'juegos variados']
    };
  }
}

function getScoreLabel(score: number): { label: string; description: string } {
  if (score >= 4.5) return { label: 'Alto', description: 'Tienes un nivel muy alto' };
  if (score >= 3.5) return { label: 'Moderado-Alto', description: 'Tienes un nivel moderado-alto' };
  if (score >= 2.5) return { label: 'Moderado', description: 'Tienes un nivel moderado' };
  if (score >= 1.5) return { label: 'Bajo-Moderado', description: 'Tienes un nivel bajo-moderado' };
  return { label: 'Bajo', description: 'Tienes un nivel bajo' };
}

export default function TestResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [copied, setCopied] = useState(false);
  const [selectedDimension, setSelectedDimension] = useState<string>('openness');

  let results: any = {};
  try {
    results = params.results ? JSON.parse(params.results as string) : {};
  } catch (error) {
    console.error('Error parsing results:', error);
  }

  const handleCopy = () => {
    try {
      Clipboard.setString(JSON.stringify(results, null, 2));
      setCopied(true);
      Alert.alert('Copiado', 'Los resultados se han copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Error', 'No se pudo copiar los resultados');
    }
  };

  // Los scores ya vienen en escala 0-5
  const normalizedDimensions: Record<string, number> = results.dimensions || {};

  const profile = getProfileDescription(results.dimensions || {});
  const isDeep = results.testType === 'deep';

  return (
    <BackgroundLayout>
      <SafeAreaView className="flex-1">
        <StatusBar barStyle="light-content" />
        
        {/* Header */}
        <View className="px-4 pt-4 pb-3 border-b border-slate-800/50">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <LinearGradient
                colors={['#a855f7', '#ec4899']}
                className="w-8 h-8 rounded-lg items-center justify-center"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Star size={18} color="white" fill="white" />
              </LinearGradient>
              <Text className="text-2xl font-extrabold text-white">DREAM LODGE</Text>
            </View>
            
            <View className="flex-row items-center gap-1">
              <TouchableOpacity className="px-3 py-2 rounded-lg">
                <Home size={18} color="#94a3b8" />
              </TouchableOpacity>
              <TouchableOpacity className="px-3 py-2 rounded-lg bg-slate-800">
                <Brain size={18} color="white" />
              </TouchableOpacity>
              <TouchableOpacity className="px-3 py-2 rounded-lg">
                <MessageCircle size={18} color="#94a3b8" />
              </TouchableOpacity>
              <TouchableOpacity className="px-3 py-2 rounded-lg">
                <User size={18} color="#94a3b8" />
              </TouchableOpacity>
              <TouchableOpacity className="px-3 py-2 rounded-lg">
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="mx-4 mt-6">
            {/* Title Section */}
            <View className="flex-row items-center gap-3 mb-4">
              <Brain size={32} color="#a855f7" />
              <Text className="text-3xl font-bold text-white">Tus Resultados</Text>
            </View>

            {/* Test Type Buttons */}
            <View className="flex-row gap-3 mb-6">
              <TouchableOpacity 
                className={`px-4 py-2 rounded-xl ${results.testType === 'quick' ? 'bg-purple-600' : 'bg-slate-700/50'}`}
              >
                <Text className="text-white font-medium">
                  {results.testType === 'quick' ? 'Descubrimiento Rápido' : 'Análisis Profundo'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600">
                <LinearGradient
                  colors={['#a855f7', '#ec4899']}
                  className="px-4 py-2 rounded-xl"
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text className="text-white font-medium">Perfil: {profile.profile}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Profile Card */}
            <View className="bg-slate-800/90 border border-slate-700/50 rounded-2xl p-6 mb-6 shadow-xl">
              <Text className="text-xl font-bold text-white mb-3">Tu Perfil Artístico</Text>
              <Text className="text-slate-300 mb-4 leading-6">{profile.description}</Text>
              <View>
                <Text className="text-slate-400 text-sm mb-2">Te recomendamos:</Text>
                <Text className="text-slate-300">{profile.recommendations.join(', ')}.</Text>
              </View>
            </View>

            {/* Big Five Chart */}
            <View className="bg-slate-800/90 border border-slate-700/50 rounded-2xl p-6 mb-6 shadow-xl">
              <Text className="text-xl font-bold text-white mb-6">Los Big Five</Text>
              
              <View className="flex-row justify-between items-end mb-4" style={{ height: 200 }}>
                {Object.entries(normalizedDimensions).map(([key, score]) => {
                  const dimInfo = DIMENSION_NAMES[key];
                  const height = (score / 5) * 180;
                  return (
                    <View key={key} className="items-center flex-1">
                      <Text className="text-white font-bold mb-2">{score.toFixed(1)}</Text>
                      <View 
                        className="rounded-t-lg w-full"
                        style={{ 
                          height: height,
                          backgroundColor: dimInfo.color,
                          minHeight: 20
                        }}
                      />
                      <Text className="text-slate-400 text-xs mt-2 text-center" numberOfLines={2}>
                        {dimInfo.es}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Detailed Analysis */}
            <View className="bg-slate-800/90 border border-slate-700/50 rounded-2xl p-6 mb-6 shadow-xl">
              <Text className="text-xl font-bold text-white mb-4">Análisis de Resultados del Test</Text>
              <Text className="text-slate-300 mb-6 leading-6">
                Tu perfil artístico muestra una combinación única de rasgos que influyen en cómo experimentas y disfrutas el arte. Aquí está tu análisis personalizado:
              </Text>

              {/* Dimension Tabs */}
              <View className="flex-row gap-2 mb-6">
                {Object.entries(normalizedDimensions).map(([key, score]) => {
                  const dimInfo = DIMENSION_NAMES[key];
                  const Icon = DIMENSION_ICONS[key] || Star;
                  const isSelected = selectedDimension === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setSelectedDimension(key)}
                      className={`flex-1 items-center py-3 rounded-xl ${
                        isSelected ? 'bg-purple-600' : 'bg-slate-700/50'
                      }`}
                    >
                      <Icon size={20} color={isSelected ? 'white' : '#94a3b8'} />
                      <Text className={`text-xs mt-1 ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                        {dimInfo.es.split(' ')[0]}
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
                  
                  <Text className="text-slate-400 mb-4">
                    Tu disposición hacia la novedad, creatividad e ideas abstractas en el arte
                  </Text>

                  {/* General Score */}
                  <View className="mb-6">
                    <Text className="text-white font-semibold mb-2">Puntuación General</Text>
                    <View className="flex-row items-center gap-3 mb-2">
                      <Text className="text-2xl font-bold text-white">
                        {normalizedDimensions[selectedDimension].toFixed(1)}/5
                      </Text>
                    </View>
                    <View className="h-3 bg-slate-700 rounded-full overflow-hidden mb-2">
                      <View 
                        className="h-full rounded-full"
                        style={{ 
                          width: `${(normalizedDimensions[selectedDimension] / 5) * 100}%`,
                          backgroundColor: DIMENSION_NAMES[selectedDimension].color
                        }}
                      />
                    </View>
                    {(() => {
                      const scoreLabel = getScoreLabel(normalizedDimensions[selectedDimension]);
                      return (
                        <Text className="text-slate-300 text-sm">
                          {scoreLabel.label} - {scoreLabel.description} de {DIMENSION_NAMES[selectedDimension].es.toLowerCase()}.
                        </Text>
                      );
                    })()}
                  </View>

                  {/* Subfacets (only for deep test) */}
                  {isDeep && results.subfacets && results.subfacets[selectedDimension] && (
                    <View>
                      <Text className="text-white font-semibold mb-4">Subfacetas Detalladas</Text>
                      {Object.entries(results.subfacets[selectedDimension]).map(([subfacet, scores]: [string, any]) => {
                        const average = scores.reduce((sum: number, val: number) => sum + val, 0) / scores.length;
                        const normalizedScore = ((average + 2) / 4) * 5; // Convertir de -2 a +2 a 0-5
                        const subfacetName = SUBFACET_NAMES[subfacet] || subfacet;
                        
                        return (
                          <View key={subfacet} className="mb-4">
                            <View className="flex-row justify-between items-center mb-2">
                              <Text className="text-white font-medium">{subfacetName}</Text>
                              <Text className="text-slate-400 text-sm">{normalizedScore.toFixed(1)}</Text>
                            </View>
                            <View className="h-2 bg-slate-700 rounded-full overflow-hidden">
                              <View 
                                className="h-full rounded-full"
                                style={{ 
                                  width: `${(normalizedScore / 5) * 100}%`,
                                  backgroundColor: DIMENSION_NAMES[selectedDimension].color
                                }}
                              />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {!isDeep && (
                    <View className="mt-4 p-4 bg-slate-700/50 rounded-xl">
                      <Text className="text-slate-300 text-sm">
                        Realiza el <Text className="font-bold underline">Análisis Profundo</Text> para ver las 5 subfacetas de cada rasgo y obtener un análisis mucho más detallado de tu personalidad artística.
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* JSON Results (Collapsible) */}
            <View className="bg-slate-800/90 border border-slate-700/50 rounded-2xl p-6 mb-6 shadow-xl">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-white font-semibold">Resultados JSON</Text>
                <TouchableOpacity
                  onPress={handleCopy}
                  className="flex-row items-center gap-2 bg-purple-600 px-4 py-2 rounded-lg"
                >
                  <Copy size={16} color="white" />
                  <Text className="text-white text-sm font-medium">
                    {copied ? 'Copiado!' : 'Copiar'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                <Text className="text-slate-300 text-xs font-mono" selectable>
                  {JSON.stringify(results, null, 2)}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-slate-700 rounded-xl py-4 items-center"
                onPress={() => router.back()}
              >
                <Text className="text-white font-semibold">Volver</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-1 bg-purple-600 rounded-xl py-4 items-center"
                onPress={() => router.replace('/src/FeedScreen')}
              >
                <Text className="text-white font-semibold">Explorar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </BackgroundLayout>
  );
}
