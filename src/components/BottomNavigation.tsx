import { usePathname, useRouter } from 'expo-router';
import { Brain, Film, MessageSquare, User } from 'lucide-react-native';
import React, { useCallback, useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

export function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { hasTestResults } = useAuth();
  
  // Memoizar shouldShow para evitar recálculos
  const shouldShow = useMemo(() => {
    return hasTestResults || pathname?.includes('test_results') || pathname?.includes('test-selection');
  }, [hasTestResults, pathname]);

  // Memoizar navItems para evitar recrear en cada render
  const navItems = useMemo(() => [
    { 
      icon: Film, 
      label: 'Explorar', 
      route: '/FeedScreen',
      active: pathname === '/FeedScreen'
    },
    { 
      icon: Brain, 
      label: 'Resultados', 
      route: '/test_results',
      active: pathname === '/test_results'
    },
    { 
      icon: MessageSquare, 
      label: 'Chat', 
      route: '/ai_chat',
      active: pathname === '/ai_chat'
    },
    { 
      icon: User, 
      label: 'Perfil', 
      route: '/user_profile',
      active: pathname === '/user_profile'
    },
  ], [pathname]);

  // Memoizar handlePress
  const handlePress = useCallback((route: string) => {
    router.push(route as any);
  }, [router]);
  
  if (!shouldShow) {
    return null;
  }

  return (
    <View 
      className="absolute bottom-0 left-0 right-0"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
      }}
    >
      <View className="bg-slate-900 border-t border-slate-800/50">
        <SafeAreaView edges={['bottom']}>
          <View className="flex-row justify-around items-center px-1 py-2">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = item.active;
              const iconColor = isActive ? '#c084fc' : '#64748b';
              const textColor = isActive ? 'text-purple-400' : 'text-slate-500';
              
              return (
                <TouchableOpacity 
                  key={index}
                  onPress={() => handlePress(item.route)}
                  className="flex-1 items-center py-2 px-1"
                  activeOpacity={0.6}
                >
                  <View className="items-center">
                    <Icon 
                      size={24} 
                      color={iconColor} 
                      fill={isActive ? iconColor : 'none'}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <Text className={`text-[10px] mt-1 font-semibold ${textColor}`}>
                      {item.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}
