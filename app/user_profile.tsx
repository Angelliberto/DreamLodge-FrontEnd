import { useRouter } from 'expo-router';
import { ArrowLeft, User } from 'lucide-react-native';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { BackgroundLayout } from '../src/components/ui/BackgroundLayout';

export default function UserProfileScreen() {
  const router = useRouter();

  return (
    <BackgroundLayout>
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 pt-14 pb-4">
          <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-2">
            <ArrowLeft size={20} color="#fff" />
            <Text className="text-white font-bold text-lg">Perfil</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="flex-1 items-center justify-center px-6 py-20">
          <User size={64} color="#8b5cf6" />
          <Text className="text-white text-xl font-bold mt-6 mb-2 text-center">
            Perfil de Usuario
          </Text>
          <Text className="text-slate-400 text-center">
            Esta funcionalidad estará disponible pronto
          </Text>
        </View>
      </ScrollView>
    </BackgroundLayout>
  );
}
