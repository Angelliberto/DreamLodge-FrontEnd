import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { LogOut, Sparkles, Star } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

interface NavigationBarProps {
  variant?: 'default' | 'simple';
  showAuth?: boolean;
  showLogout?: boolean;
}

export function NavigationBar({ 
  variant = 'default', 
  showAuth = true,
  showLogout = true 
}: NavigationBarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleAuthPress = () => {
    router.push('/login');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (variant === 'simple') {
    return (
      <View className="px-4 pt-12 pb-3">
        <View className="flex-row justify-between items-center">
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
          
          {user && (
            <View className="flex-row items-center gap-2">
              <TouchableOpacity 
                onPress={handleLogout} 
                className="bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 flex-row items-center gap-1.5"
              >
                <LogOut size={12} color="#ef4444" />
                <Text className="text-red-400 font-medium text-xs">Salir</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-row justify-between items-center px-4 pt-12 pb-4">
      <View className="flex-row items-center gap-2">
        <LinearGradient
          colors={['#c084fc', '#db2777']}
          className="w-8 h-8 rounded-lg items-center justify-center"
        >
          <Sparkles size={16} color="white" />
        </LinearGradient>
        <Text className="text-white font-bold text-base tracking-tight">Dream Lodge</Text>
      </View>
      
      {!user && showAuth && (
        <TouchableOpacity 
          onPress={handleAuthPress} 
          className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10"
        >
          <Text className="text-white font-medium text-xs">Iniciar sesión</Text>
        </TouchableOpacity>
      )}
      
      {user && (
        <View className="flex-row items-center gap-2">
          <TouchableOpacity 
            onPress={handleLogout} 
            className="bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 flex-row items-center gap-1.5"
          >
            <LogOut size={12} color="#ef4444" />
            <Text className="text-red-400 font-medium text-xs">Salir</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
