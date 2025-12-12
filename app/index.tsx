import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { 
  Sparkles, 
  ArrowRight, 
  Film, 
  Music, 
  BookOpen, 
  Gamepad2, 
  Palette, 
  Check, 
  LogOut, 
  TrendingUp,
  Brain,
  MessageSquare,
  Star,
  Heart
} from "lucide-react-native";

// Importaciones locales
import { BackgroundLayout } from "./src/components/ui/BackgroundLayout";
import { Button } from "./src/components/ui/button";
import { AuthModal } from "./src/components/AuthModal";
import { useAuth } from "./src/contexts/AuthContext";

const { width } = Dimensions.get('window');

// Configuración de Categorías
const CATEGORIES = [
  { icon: Film, label: 'Cine', c1: '#3b82f6', c2: '#06b6d4' },
  { icon: Palette, label: 'Arte Visual', c1: '#ec4899', c2: '#f43f5e' },
  { icon: BookOpen, label: 'Literatura', c1: '#a855f7', c2: '#8b5cf6' },
  { icon: Music, label: 'Música', c1: '#22c55e', c2: '#10b981' },
  { icon: Gamepad2, label: 'Videojuegos', c1: '#f97316', c2: '#f59e0b' },
];

// Rasgos de Personalidad (Big Five)
const PERSONALITY_TRAITS = [
    { label: 'Apertura', letter: 'O', desc: 'Curiosidad y creatividad', colors: ['#a855f7', '#db2777'] }, // Purple
    { label: 'Conciencia', letter: 'C', desc: 'Organización y disciplina', colors: ['#3b82f6', '#06b6d4'] }, // Blue
    { label: 'Extraversión', letter: 'E', desc: 'Energía y sociabilidad', colors: ['#22c55e', '#10b981'] }, // Green
    { label: 'Amabilidad', letter: 'A', desc: 'Cooperación y compasión', colors: ['#ef4444', '#f97316'] }, // Red/Orange
    { label: 'Neuroticismo', letter: 'N', desc: 'Estabilidad emocional', colors: ['#f59e0b', '#facc15'] }, // Yellow
];

// Estadísticas
const STATS = [
    { value: '20+', label: 'Tipos de arte' },
    { value: '5', label: 'Rasgos de personalidad' },
    { value: '25', label: 'Millones de obras' },
    { value: '100%', label: 'Gratis' },
];


export default function HomeScreen() {
  const { user, logout } = useAuth(); 
  const [authVisible, setAuthVisible] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const router = useRouter();

  const openAuth = (tab: 'login' | 'register') => {
    setAuthTab(tab);
    setAuthVisible(true);
  };

  // Componente interno para las tarjetas de funcionalidades
  const FeatureCard = ({ icon, title, desc, features, colors }: { icon: React.ElementType, title: string, desc: string, features: string[], colors: string[] }) => {
    const Icon = icon;
    return (
      <View className="bg-slate-800/60 border border-slate-700/50 p-6 rounded-2xl mb-4 w-full shadow-lg shadow-black/20">
          <View className="mb-4">
              <LinearGradient
                  colors={colors as [string, string, ...string[]]}
                  className="w-14 h-14 rounded-xl items-center justify-center shadow-lg shadow-black/40"
                  start={{x:0, y:0}} end={{x:1, y:1}}
              >
                  <Icon size={24} color="white" />
              </LinearGradient>
          </View>
          <Text className="text-xl font-bold text-white mb-2">{title}</Text>
          <Text className="text-slate-400 text-sm leading-6">{desc}</Text>
          
          <View className="mt-4 space-y-2">
            {features.map((feature, i) => (
              <View key={i} className="flex-row items-center gap-2">
                  <View className="w-5 h-5 rounded-full bg-green-500/20 items-center justify-center">
                      <Check size={12} color="#4ade80" />
                  </View>
                  <Text className="text-slate-400 text-xs">{feature}</Text>
              </View>
            ))}
          </View>
      </View>
    );
  };

  return (
    <BackgroundLayout>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* --- NAVBAR --- */}
        <View className="flex-row justify-between items-center px-6 pt-14 pb-4">
            <View className="flex-row items-center gap-2">
                <LinearGradient
                    colors={['#c084fc', '#db2777']}
                    className="w-8 h-8 rounded-lg items-center justify-center"
                >
                    <Sparkles size={16} color="white" />
                </LinearGradient>
                <Text className="text-white font-bold text-lg tracking-tight">Dream Lodge</Text>
            </View>
            
            {!user && (
                <TouchableOpacity onPress={() => openAuth('login')} className="bg-white/10 px-4 py-2 rounded-lg border border-white/10">
                    <Text className="text-white font-medium text-xs">Iniciar sesión</Text>
                </TouchableOpacity>
            )}
             {user && (
                <TouchableOpacity onPress={logout} className="bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20 flex-row items-center gap-2">
                    <LogOut size={14} color="#ef4444" />
                    <Text className="text-red-400 font-medium text-xs">Salir</Text>
                </TouchableOpacity>
            )}
        </View>

        {/* --- HERO SECTION --- */}
        <View className="px-6 pt-10 pb-16 items-center w-full">
            <View className="flex-row items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-4 py-2 rounded-full mb-8">
                <Star size={12} color="#d8b4fe" />
                <Text className="text-purple-200 text-xs font-medium">Impulsado por IA y Big Five</Text>
            </View>

            <Text className="text-5xl font-bold text-white text-center leading-tight mb-2">
                Descubre arte que
            </Text>
            <Text className="text-5xl font-bold text-fuchsia-400 text-center leading-tight mb-6 shadow-sm shadow-fuchsia-500">
                resuena contigo
            </Text>

            <Text className="text-slate-300 text-center text-base mb-10 leading-6 max-w-sm">
                Una plataforma inteligente que conecta tu personalidad con cine, música, literatura, arte visual y videojuegos.
            </Text>

            <Button 
                title="Comenzar gratis" 
                className="w-full h-14 mb-10 shadow-xl shadow-purple-500/50"
                icon={<ArrowRight size={20} color="white" />}
                onPress={() => openAuth('register')}
            />
            
            <View className="flex-row flex-wrap justify-center gap-x-6 gap-y-2">
                {['100% Gratis', 'Sin tarjeta', 'IA avanzada'].map((text, i) => (
                    <View key={i} className="flex-row items-center gap-1.5">
                        <Check size={14} color="#4ade80" />
                        <Text className="text-slate-400 text-xs">{text}</Text>
                    </View>
                ))}
            </View>
        </View>

        {/* --- SECCIÓN CATEGORÍAS --- */}
        <View className="px-4 py-8 w-full">
            <Text className="text-3xl font-bold text-white text-center mb-2">Explora 5 formas de arte</Text>
            <Text className="text-slate-400 text-center text-sm mb-8">Obras cuidadosamente seleccionadas</Text>

            <View className="flex-row flex-wrap justify-center gap-3">
                {CATEGORIES.map((cat, i) => {
                    const Icon = cat.icon;
                    // Uso de w-[31%] para cuadrícula de 3 que se ajusta a gap-3 (4px)
                    const itemWidthClass = 'w-[31%]'; 
                    
                    return (
                        <View key={i} className={`${itemWidthClass} aspect-square bg-slate-800/60 border border-slate-700/50 rounded-2xl items-center justify-center p-2 mb-3 shadow-md shadow-black/20`}>
                            <LinearGradient
                                colors={[cat.c1, cat.c2] as [string, string]}
                                className="w-12 h-12 rounded-xl items-center justify-center mb-3 shadow-lg shadow-black/40"
                            >
                                <Icon size={20} color="white" />
                            </LinearGradient>
                            <Text className="text-white text-xs font-medium text-center">{cat.label}</Text>
                        </View>
                    );
                })}
            </View>
        </View>

        {/* --- SECCIÓN FUNCIONALIDADES (Funcionalidades principales) --- */}
        <View className="px-6 py-10 w-full">
            <Text className="text-3xl font-bold text-white text-center mb-2">Funcionalidades principales</Text>
            <Text className="text-slate-400 text-center text-sm mb-10">Herramientas potentes para tu experiencia</Text>

            <FeatureCard 
                icon={TrendingUp}
                title="Exploración Inteligente"
                desc="Descubre obras con filtros avanzados, fichas detalladas y recomendaciones basadas en tu perfil."
                features={['Análisis detallado', 'Recomendaciones IA', 'Filtros avanzados']}
                colors={['#3b82f6', '#06b6d4']}
            />
            
            <FeatureCard 
                icon={Brain}
                title="Test de Personalidad Big 5"
                desc="Completa nuestro test psicológico validado científicamente para obtener un perfil detallado."
                features={['Base científica', 'Perfil detallado', 'Rastreo de progreso']}
                colors={['#a855f7', '#ec4899']}
            />

             <FeatureCard 
                icon={MessageSquare}
                title="Chat con IA Contextual"
                desc="Conversa sobre arte con nuestra IA avanzada que comprende tu personalidad."
                features={['Soporte 24/7', 'Respuestas personalizadas', 'Historial de chat']}
                colors={['#ec4899', '#f43f5e']}
            />
        </View>
        
        {/* --- SECCIÓN RASGOS DE PERSONALIDAD --- */}
        <View className="px-6 py-10 w-full">
            <Text className="text-3xl font-bold text-white text-center mb-2">Los 5 rasgos de personalidad</Text>
            <Text className="text-slate-400 text-center text-sm mb-10">Basado en el modelo Big Five, avalado psicológicamente y revisado científicamente.</Text>

            {/* Cuadrícula de Rasgos */}
            <View className="flex-row flex-wrap justify-center gap-4 mb-10">
                {PERSONALITY_TRAITS.map((trait, i) => {
                    const [c1, c2] = trait.colors;
                    return (
                        <View key={i} className="w-[45%] bg-slate-800/60 border border-slate-700/50 p-4 rounded-xl items-center shadow-lg shadow-black/20">
                            <LinearGradient
                                colors={[c1, c2] as [string, string]}
                                className="w-12 h-12 rounded-full items-center justify-center mb-3 shadow-xl shadow-black/40"
                                start={{x:0, y:0}} end={{x:1, y:1}}
                            >
                                <Text className="text-white text-xl font-extrabold">{trait.letter}</Text>
                            </LinearGradient>
                            <Text className="text-lg font-bold text-white mb-1">{trait.label}</Text>
                            <Text className="text-slate-400 text-xs text-center">{trait.desc}</Text>
                        </View>
                    );
                })}
            </View>

            {/* Estadísticas */}
            <View className="flex-row flex-wrap justify-between">
                {STATS.map((stat, i) => (
                    <View key={i} className="w-[22%] items-center p-2">
                        <Text className="text-3xl font-extrabold text-white">{stat.value}</Text>
                        <Text className="text-slate-400 text-xs text-center">{stat.label}</Text>
                    </View>
                ))}
            </View>
        </View>


        {/* --- CTA FINAL --- */}
        <View className="px-6 py-10 pb-20 w-full">
            <LinearGradient
                colors={['rgba(88, 28, 135, 0.5)', 'rgba(0,0,0,0)']}
                className="p-8 rounded-[32px] border border-purple-500/30 items-center overflow-hidden shadow-xl shadow-purple-900/40"
                start={{x:0.5, y:0}} end={{x:0.5, y:1}}
            >
                <View className="w-16 h-16 bg-white/10 rounded-2xl items-center justify-center mb-6 border border-white/10">
                    <Sparkles size={32} color="white" />
                </View>
                <Text className="text-2xl font-bold text-white text-center mb-4">
                    Comienza tu viaje artístico
                </Text>
                <Text className="text-slate-300 text-center mb-8 text-sm">
                    Crea tu cuenta gratis y descubre un universo de arte personalizado.
                </Text>
                <Button 
                    title="Empezar ahora" 
                    className="w-full h-12 shadow-xl shadow-purple-500/50"
                    onPress={() => openAuth('register')}
                />
            </LinearGradient>
        </View>

      </ScrollView>

      {/* Auth Modal Global */}
      <AuthModal 
        visible={authVisible} 
        onClose={() => setAuthVisible(false)} 
        defaultTab={authTab}
      />
    </BackgroundLayout>
  );
}