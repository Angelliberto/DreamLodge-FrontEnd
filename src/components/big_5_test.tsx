import { saveTestResults } from '@/api/client';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Brain, Check, CheckCircle2, Star } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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
import easierTestData from '../../app/data/easier_test.json';
import questionsData from '../../app/data/questions_json.json';
import { useAuth } from '../contexts/AuthContext';
import { BottomNavigation } from './BottomNavigation';
import { NavigationBar } from './NavigationBar';
import { BackgroundLayout } from './ui/BackgroundLayout';

// const { width } = Dimensions.get('window'); // No usado actualmente

type TestType = 'quick' | 'deep' | null;
type Question = {
  id: number;
  dimension: string;
  subfacet?: string;
  medium: string;
  text: string;
  keying?: 'positive' | 'negative';
};

type Answer = {
  questionId: number;
  value: number; // -2 to +2
};

const DEEP_QUESTIONS = questionsData as Question[];
const DEEP_SUBFACETS_COUNT = new Set(DEEP_QUESTIONS.map((q) => q.subfacet).filter(Boolean)).size;
const QUICK_QUESTIONS = easierTestData as Question[];

// Pantalla de selección de test
export function TestSelectionScreen() {
  const router = useRouter();
  const { logout, hasQuickTest, hasDeepTest, isLoading } = useAuth();

  // Redirigir automáticamente a FeedScreen si tiene ambos tests
  useEffect(() => {
    if (!isLoading && hasQuickTest && hasDeepTest) {
      router.replace('/FeedScreen');
    }
  }, [isLoading, hasQuickTest, hasDeepTest, router]);

  const handleStartTest = (testType: TestType) => {
    if (testType) {
      console.log('Starting test:', testType);
      router.push(`/big-5-test?testType=${testType}`);
    }
  };

  const handleLeaveSelection = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/FeedScreen');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  // Si está cargando o tiene ambos tests, mostrar loading
  if (isLoading || (hasQuickTest && hasDeepTest)) {
    return (
      <BackgroundLayout>
        <SafeAreaView className="flex-1">
          <StatusBar barStyle="light-content" />
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#c084fc" />
            <Text className="mt-4 text-slate-400">Cargando...</Text>
          </View>
        </SafeAreaView>
      </BackgroundLayout>
    );
  }

  return (
    <BackgroundLayout>
      <SafeAreaView className="flex-1">
        <StatusBar barStyle="light-content" />
        
        {/* Header Navigation */}
        <View className="px-4 pt-12 pb-3 border-b border-slate-800/50">
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
              <Text className="text-xl font-extrabold text-white">DREAM LODGE</Text>
            </View>
            
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={handleLeaveSelection}
                className="flex-row items-center gap-1.5 rounded-lg border border-slate-600/50 bg-slate-700/50 px-3 py-1.5"
              >
                <Text className="text-xs font-medium text-slate-300">Cancelar</Text>
              </TouchableOpacity>
              
            </View>
          </View>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Main Content Card */}
          <View className="items-center px-6 pt-12 pb-8">
            <View className="w-24 h-24 rounded-full bg-purple-500/20 items-center justify-center mb-6">
              <Brain size={48} color="#a855f7" />
            </View>
            
            <Text className="text-3xl font-bold text-white text-center mb-4">
              Test de Personalidad Artística
            </Text>
            
            <Text className="text-base text-slate-400 text-center px-4 leading-6">
              {hasQuickTest || hasDeepTest 
                ? 'Completa el test que falta o rehaz uno de los tests para actualizar tus resultados.'
                : 'Para comenzar tu experiencia en Dream Lodge, necesitamos conocer tu perfil artístico. Elige el tipo de test que prefieres realizar.'}
            </Text>
          </View>

          {/* Test Options */}
          <View className="px-6 gap-6">
            {/* Quick Test Card */}
            <View className={`bg-slate-800/90 border rounded-2xl p-6 shadow-xl ${
              hasQuickTest ? 'border-green-500/50' : 'border-slate-700/50'
            }`}>
              <View className="flex-row items-start gap-4 mb-4">
                <View className="w-16 h-16 rounded-xl bg-blue-500/20 items-center justify-center">
                  <Star size={32} color="#3b82f6" fill="#3b82f6" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-xl font-bold text-white">
                    Descubrimiento Rápido
                  </Text>
                    {hasQuickTest && (
                      <CheckCircle2 size={20} color="#22c55e" fill="#22c55e" />
                    )}
                  </View>
                  <Text className="text-sm text-slate-400 leading-5">
                    {`${QUICK_QUESTIONS.length} preguntas Mini-IPIP para una medición breve de los 5 rasgos`}
                  </Text>
                  {hasQuickTest && (
                    <Text className="text-xs text-green-400 mt-2 font-medium">
                      ✓ Test completado
                    </Text>
                  )}
                </View>
              </View>

              <View className="mb-6 gap-2">
                {[
                  '5 rasgos principales',
                  'Mini-IPIP validado',
                  'Recomendaciones generales',
                  '~5 minutos'
                ].map((feature, idx) => (
                  <View key={idx} className="flex-row items-center gap-2">
                    <Check size={16} color="#22c55e" />
                    <Text className="text-sm text-slate-300">{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                className={`rounded-xl py-4 items-center ${
                  hasQuickTest ? 'bg-green-600' : 'bg-blue-600'
                }`}
                onPress={() => handleStartTest('quick')}
                activeOpacity={0.8}
              >
                <Text className="text-white font-bold text-base">
                  {hasQuickTest ? 'Rehacer Test Rápido' : 'Comenzar Test Rápido'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Deep Test Card */}
            <View className={`bg-slate-800/90 border rounded-2xl p-6 shadow-xl ${
              hasDeepTest ? 'border-green-500/50' : 'border-slate-700/50'
            }`}>
              <View className="flex-row items-start gap-4 mb-4">
                <View className="w-16 h-16 rounded-xl bg-purple-500/20 items-center justify-center">
                  <Brain size={32} color="#a855f7" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-xl font-bold text-white">
                    Análisis Profundo
                  </Text>
                    {hasDeepTest && (
                      <CheckCircle2 size={20} color="#22c55e" fill="#22c55e" />
                    )}
                  </View>
                  <Text className="text-sm text-slate-400 leading-5">
                    {`${DEEP_QUESTIONS.length} preguntas para un análisis detallado con ${DEEP_SUBFACETS_COUNT} subfacetas`}
                  </Text>
                  {hasDeepTest && (
                    <Text className="text-xs text-green-400 mt-2 font-medium">
                      ✓ Test completado
                    </Text>
                  )}
                </View>
              </View>

              <View className="mb-6 gap-2">
                {[
                  '5 rasgos principales',
                  `${DEEP_SUBFACETS_COUNT} subfacetas detalladas`,
                  'Análisis en profundidad',
                  'Recomendaciones precisas',
                  '~25 minutos'
                ].map((feature, idx) => (
                  <View key={idx} className="flex-row items-center gap-2">
                    <Check size={16} color="#22c55e" />
                    <Text className="text-sm text-slate-300">{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                className={`rounded-xl py-4 items-center ${
                  hasDeepTest ? 'bg-green-600' : 'bg-purple-600'
                }`}
                onPress={() => handleStartTest('deep')}
                activeOpacity={0.8}
              >
                <Text className="text-white font-bold text-base">
                  {hasDeepTest ? 'Rehacer Análisis Profundo' : 'Comenzar Análisis Profundo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
        <BottomNavigation />
      </SafeAreaView>
    </BackgroundLayout>
  );
}

// Pantalla del test
export default function BigFiveTestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, checkTestResults, hasQuickTest, hasDeepTest } = useAuth();
  const testType = (params?.testType as TestType);
  
  // Todos los hooks deben estar antes de cualquier return condicional
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  
  console.log('Test screen params:', params, 'testType:', testType);
  
  // Si no hay testType, mostrar pantalla de selección
  if (!testType) {
    return <TestSelectionScreen />;
  }

  const questions: Question[] = testType === 'quick'
    ? QUICK_QUESTIONS
    : DEEP_QUESTIONS;

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleAnswer = (value: number) => {
    setSelectedValue(value);
    const newAnswer: Answer = {
      questionId: currentQuestion.id,
      value
    };
    
    const existingAnswerIndex = answers.findIndex(a => a.questionId === currentQuestion.id);
    if (existingAnswerIndex >= 0) {
      const newAnswers = [...answers];
      newAnswers[existingAnswerIndex] = newAnswer;
      setAnswers(newAnswers);
    } else {
      setAnswers([...answers, newAnswer]);
    }
  };

  const handleNext = () => {
    if (selectedValue === null) {
      Alert.alert('Por favor', 'Selecciona una respuesta antes de continuar');
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      const nextAnswer = answers.find(a => a.questionId === questions[currentQuestionIndex + 1].id);
      setSelectedValue(nextAnswer?.value ?? null);
    } else {
      calculateResults();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      const prevAnswer = answers.find(a => a.questionId === questions[currentQuestionIndex - 1].id);
      setSelectedValue(prevAnswer?.value ?? null);
    }
  };

  const handleCancel = () => {
    // Reset the in-progress questionnaire state before leaving.
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setSelectedValue(null);

    if (hasQuickTest || hasDeepTest) {
      router.replace('/test_results');
      return;
    }

    router.replace('/test-selection');
  };

  const getScoredValue = (question: Question, answerValue: number) => {
    // IPIP/AB5C methodology: reverse-score negatively keyed items.
    return question.keying === 'negative' ? -answerValue : answerValue;
  };

  const calculateResults = async () => {
    setLoading(true);
    
    // Agrupar respuestas por dimensión
    const dimensionScores: Record<string, number[]> = {};
    
    answers.forEach(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      if (question) {
        if (!dimensionScores[question.dimension]) {
          dimensionScores[question.dimension] = [];
        }
        dimensionScores[question.dimension].push(getScoredValue(question, answer.value));
      }
    });

    // Calcular promedio por dimensión (escala -2 a +2, convertir a 0-5)
    const results: Record<string, number> = {};
    Object.keys(dimensionScores).forEach(dimension => {
      const scores = dimensionScores[dimension];
      const average = scores.reduce((sum, val) => sum + val, 0) / scores.length;
      // Convertir de -2 a +2 a 0-5
      results[dimension] = ((average + 2) / 4) * 5;
    });

    // Si es test profundo, calcular subfacetas (guardar valores raw para cálculo después)
    const subfacetScores: Record<string, Record<string, number[]>> = {};
    if (testType === 'deep') {
      answers.forEach(answer => {
        const question = questions.find(q => q.id === answer.questionId);
        if (question && question.subfacet) {
          if (!subfacetScores[question.dimension]) {
            subfacetScores[question.dimension] = {};
          }
          if (!subfacetScores[question.dimension][question.subfacet]) {
            subfacetScores[question.dimension][question.subfacet] = [];
          }
          subfacetScores[question.dimension][question.subfacet].push(getScoredValue(question, answer.value));
        }
      });
    }

    const finalResults = {
      testType,
      totalQuestions: questions.length,
      answeredQuestions: answers.length,
      dimensions: results,
      ...(testType === 'deep' && { subfacets: subfacetScores }),
      timestamp: new Date().toISOString()
    };

    // Guardar resultados en el backend si el usuario está autenticado
    if (user?._id) {
      try {
        await saveTestResults(user._id, finalResults);
        await checkTestResults(); // Actualizar el estado de hasTestResults
        console.log('Resultados del test guardados exitosamente en el servidor');
      } catch (error: any) {
        console.error('Error guardando resultados:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Error desconocido';
        Alert.alert(
          'Advertencia', 
          `Los resultados se guardaron localmente pero no se pudieron sincronizar con el servidor: ${errorMessage}`
        );
      }
    }

    // Navegar a resultados
    setLoading(false);
    router.push({
      pathname: '/test_results',
      params: { results: JSON.stringify(finalResults) }
    });
  };

  const scaleOptions = [
    { value: -2, label: 'Totalmente en desacuerdo', color: '#ef4444' },
    { value: -1, label: '', color: '#f87171' },
    { value: 0, label: 'Neutral', color: '#64748b' },
    { value: 1, label: '', color: '#86efac' },
    { value: 2, label: 'Totalmente de acuerdo', color: '#22c55e' }
  ];

  return (
    <BackgroundLayout>
      <SafeAreaView className="flex-1">
        <StatusBar barStyle="light-content" />
        
        <NavigationBar
          variant="simple"
          showAuth={false}
          showLogout={!!user}
          onCancel={handleCancel}
        />

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#c084fc" />
            <Text className="mt-4 text-slate-400">Calculando resultados...</Text>
          </View>
        ) : (
          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Test Card */}
            <View className="mx-4 mt-6 bg-slate-800/90 border border-slate-700/50 rounded-2xl p-6 shadow-xl">
              {/* Back Button */}
              <TouchableOpacity 
                className="mb-4 flex-row items-center gap-2"
                onPress={() => router.back()}
              >
                <ArrowLeft size={20} color="#94a3b8" />
                <Text className="text-slate-400">Volver</Text>
              </TouchableOpacity>

              {/* Progress */}
              <View className="mb-6">
                <Text className="text-sm text-slate-400 mb-2">
                  Pregunta {currentQuestionIndex + 1} de {questions.length}
                </Text>
                <View className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <View 
                    className="h-full bg-purple-600 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </View>
              </View>

              {/* Pregunta: altura fija compacta, sin scroll (el texto hace wrap y lo que no cabe queda recortado) */}
              <View
                className="mb-8 items-center justify-center overflow-hidden rounded-xl border border-slate-700/40 bg-slate-900/35 px-3 py-2.5"
                style={{ height: 132 }}
              >
                <Text className="w-full text-center text-lg font-semibold leading-6 text-white">
                  {currentQuestion.text}
                </Text>
              </View>

              {/* Likert Scale */}
              <View className="flex-row justify-between mb-8">
                {scaleOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => handleAnswer(option.value)}
                    className={`w-14 h-14 rounded-full items-center justify-center ${
                      selectedValue === option.value 
                        ? 'border-2 border-white' 
                        : 'border border-slate-600'
                    }`}
                    style={{ backgroundColor: selectedValue === option.value ? option.color : '#1e293b' }}
                  >
                    <Text className="text-white font-bold text-sm">
                      {option.value > 0 ? `+${option.value}` : option.value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Labels */}
              <View className="flex-row justify-between mb-8 px-2">
                <Text className="text-xs text-red-400 text-center flex-1">
                  {scaleOptions[0].label}
                </Text>
                <View className="flex-1" />
                <Text className="text-xs text-slate-400 text-center flex-1">
                  {scaleOptions[2].label}
                </Text>
                <View className="flex-1" />
                <Text className="text-xs text-green-400 text-center flex-1">
                  {scaleOptions[4].label}
                </Text>
              </View>

              {/* Navigation Buttons */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 bg-slate-700 rounded-xl py-4 items-center"
                  onPress={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                  style={{ opacity: currentQuestionIndex === 0 ? 0.5 : 1 }}
                >
                  <Text className="text-white font-semibold">Anterior</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  className="flex-1 bg-slate-900 rounded-xl py-4 items-center"
                  onPress={handleNext}
                >
                  <Text className="text-white font-semibold">
                    {currentQuestionIndex === questions.length - 1 ? 'Finalizar' : 'Siguiente'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </BackgroundLayout>
  );
}
