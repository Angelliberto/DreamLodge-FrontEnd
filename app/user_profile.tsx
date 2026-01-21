import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Brain, Film, Heart, Shield, Sparkles } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { useAuth } from '../src/contexts/AuthContext';
import { getUserTestResults } from '../src/services/DL_api/api';

const DIMENSION_NAMES: Record<string, { es: string; color: string }> = {
  openness: { es: 'Apertura', color: '#ec4899' },
  conscientiousness: { es: 'Responsabilidad', color: '#22c55e' },
  extraversion: { es: 'Extraversión', color: '#3b82f6' },
  agreeableness: { es: 'Amabilidad', color: '#f97316' },
  neuroticism: { es: 'Neuroticismo', color: '#a855f7' }
};

function getProfileDescription(dimensions: Record<string, number>): { profile: string; description: string } {
  const openness = (dimensions.openness || 0) / 20;
  const extraversion = (dimensions.extraversion || 0) / 20;
  const neuroticism = (dimensions.neuroticism || 0) / 20;

  if (openness > 4 && neuroticism > 3.5) {
    return {
      profile: 'Existencial',
      description: 'Buscas obras que cuestionen la existencia'
    };
  } else if (openness > 3.5 && extraversion < 2) {
    return {
      profile: 'Contemplativo',
      description: 'Prefieres experiencias que invitan a la reflexión'
    };
  } else if (openness > 4) {
    return {
      profile: 'Explorador',
      description: 'Te encanta descubrir nuevas formas de expresión'
    };
  } else {
    return {
      profile: 'Equilibrado',
      description: 'Tienes un perfil artístico balanceado'
    };
  }
}

export default function UserProfileScreen() {
  const router = useRouter();
  const { user, hasTestResults } = useAuth();
  const [activeTab, setActiveTab] = useState<'favorites' | 'pending'>('favorites');
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<any>(null);
  const [profile, setProfile] = useState<{ profile: string; description: string } | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user?._id) {
        setLoading(false);
        return;
      }

      try {
        // Load test results
        if (hasTestResults) {
          const results = await getUserTestResults(user._id);
          if (results && Array.isArray(results) && results.length > 0) {
            const latestResult = results[0];
            const dimensions: Record<string, number> = {};
            
            if (latestResult.scores) {
              Object.keys(latestResult.scores).forEach((dimension) => {
                const scoreObj = latestResult.scores[dimension];
                if (scoreObj && typeof scoreObj.total === 'number') {
                  dimensions[dimension] = scoreObj.total;
                }
              });
            }
            
            setTestResults({ dimensions });
            setProfile(getProfileDescription(dimensions));
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user, hasTestResults]);

  const favoritesCount = 0; // TODO: Load from API
  const pendingCount = 0; // TODO: Load from API

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
          <View className="px-4 pt-4 pb-4">
            <View className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
              <Text className="text-white font-bold text-lg mb-3">Usuario</Text>
              <Text className="text-slate-300 text-sm mb-4">{user?.email || 'usuario@gmail.com'}</Text>
              
              <View className="flex-row gap-4 mb-4">
                <View className="flex-1">
                  <Text className="text-slate-400 text-xs mb-1">Favoritos</Text>
                  <Text className="text-white font-semibold text-lg">{favoritesCount}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-xs mb-1">Pendientes</Text>
                  <Text className="text-white font-semibold text-lg">{pendingCount}</Text>
                </View>
              </View>

              <View className="border-t border-slate-700/50 pt-3 mt-2">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Shield size={16} color="#64748b" />
                    <Text className="text-slate-400 text-xs">Autenticación de dos factores</Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-slate-500 text-xs">Desactivado</Text>
                    <TouchableOpacity className="bg-purple-600/20 px-3 py-1 rounded-lg border border-purple-500/30">
                      <Text className="text-purple-300 text-xs font-medium">Activar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Artistic Profile Section */}
          {profile && testResults && (
            <View className="px-4 pt-2 pb-4">
              <Text className="text-white font-bold text-lg mb-3">Tu Perfil Artístico</Text>
              
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
                  const percentage = (score / 5) * 100;
                  
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
          <View className="px-4 pt-2 pb-3">
            <View className="flex-row bg-slate-800/40 rounded-xl p-1">
              <TouchableOpacity
                onPress={() => setActiveTab('favorites')}
                className={`flex-1 py-2 rounded-lg items-center ${
                  activeTab === 'favorites' ? 'bg-purple-600/30' : ''
                }`}
              >
                <Text className={`text-sm font-medium ${
                  activeTab === 'favorites' ? 'text-white' : 'text-slate-400'
                }`}>
                  Favoritos
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('pending')}
                className={`flex-1 py-2 rounded-lg items-center ${
                  activeTab === 'pending' ? 'bg-purple-600/30' : ''
                }`}
              >
                <Text className={`text-sm font-medium ${
                  activeTab === 'pending' ? 'text-white' : 'text-slate-400'
                }`}>
                  Pendientes
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Artworks List */}
          <View className="px-4 pb-4">
            {activeTab === 'favorites' && favoritesCount === 0 && (
              <View className="items-center py-8">
                <Heart size={48} color="#64748b" />
                <Text className="text-slate-400 text-sm mt-3">No tienes favoritos aún</Text>
                <Text className="text-slate-500 text-xs mt-1">Explora y guarda tus obras favoritas</Text>
              </View>
            )}
            
            {activeTab === 'pending' && pendingCount === 0 && (
              <View className="items-center py-8">
                <Film size={48} color="#64748b" />
                <Text className="text-slate-400 text-sm mt-3">No tienes pendientes</Text>
                <Text className="text-slate-500 text-xs mt-1">Marca obras que quieres ver después</Text>
              </View>
            )}
          </View>

          {/* Activity Summary */}
          <View className="px-4 pt-2 pb-6">
            <Text className="text-white font-bold text-lg mb-3">Tu actividad</Text>
            <View className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
              <View className="mb-3">
                <Text className="text-slate-400 text-xs mb-2">Tipos de arte explorados</Text>
                <View className="flex-row flex-wrap gap-2">
                  {['Cine', 'Música', 'Literatura'].map((type, i) => (
                    <View key={i} className="bg-purple-600/20 px-3 py-1 rounded-full border border-purple-500/30">
                      <Text className="text-purple-300 text-xs">{type}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="mb-3">
                <Text className="text-slate-400 text-xs mb-2">Emociones frecuentes</Text>
                <View className="flex-row flex-wrap gap-2">
                  {['ansiedad', 'ira', 'asombro', 'paz', 'melancolía'].map((emotion, i) => (
                    <View key={i} className="bg-slate-700/50 px-3 py-1 rounded-full">
                      <Text className="text-slate-300 text-xs">{emotion}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="border-t border-slate-700/50 pt-3">
                <Text className="text-slate-400 text-xs mb-1">Total de obras</Text>
                <Text className="text-white font-bold text-2xl">5</Text>
              </View>
            </View>
          </View>
        </ScrollView>
        <BottomNavigation />
      </SafeAreaView>
    </BackgroundLayout>
  );
}
