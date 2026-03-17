import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { BackgroundLayout } from "../src/components/ui/BackgroundLayout";
import { useAuth } from "../src/contexts/AuthContext";

export default function HomeScreen() {
  const { user, hasTestResults, hasQuickTest, hasDeepTest, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // Si el usuario está autenticado, redirigir según si tiene test
    if (user) {
      // Si tiene al menos un test completado, ir a FeedScreen
      if (hasTestResults || hasQuickTest || hasDeepTest) {
        router.replace('/FeedScreen');
      } else {
        router.replace('/test-selection');
      }
    } else {
      // Si no está autenticado, redirigir a login
      router.replace('/login');
    }
  }, [user, hasTestResults, hasQuickTest, hasDeepTest, isLoading, router]);

  // Mostrar loading mientras se verifica la autenticación
  return (
    <BackgroundLayout>
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#c084fc" />
      </View>
    </BackgroundLayout>
  );
}