import { LinearGradient } from 'expo-linear-gradient';
import { Settings } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { uiTokens } from '@/theme/tokens';

type ProfileHeaderProps = {
  name?: string;
  email?: string;
  onPressSettings?: () => void;
};

export function ProfileHeader({
  name = 'Usuario',
  email = 'usuario@gmail.com',
  onPressSettings,
}: ProfileHeaderProps) {
  const cleanName = name.trim() || 'Usuario';
  const initial = cleanName.charAt(0).toUpperCase();

  return (
    <View className="px-4 pt-4 pb-3">
      <View className="flex-row items-center border-b border-slate-700/60 pb-4">
        <LinearGradient
          colors={uiTokens.gradient.avatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="h-12 w-12 items-center justify-center rounded-full"
        >
          <Text className="text-white text-xl font-bold">
            {initial}
          </Text>
        </LinearGradient>

        <View className="ml-3 flex-1">
          <Text
            className="text-white text-xl font-bold"
            numberOfLines={1}
          >
            {cleanName}
          </Text>

          <Text
            className="mt-0.5 text-sm text-slate-400"
            numberOfLines={1}
          >
            {email}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPressSettings}
          className="ml-3 h-11 w-11 items-center justify-center rounded-full bg-slate-800/70"
          accessibilityRole="button"
          accessibilityLabel="Abrir configuracion del perfil"
        >
          <Settings size={24} color={uiTokens.color.iconPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}