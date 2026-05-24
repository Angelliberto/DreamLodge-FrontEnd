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

    const timeout = setTimeout(() => {
      if (user) {
        if (hasTestResults || hasQuickTest || hasDeepTest) {
          router.replace('/FeedScreen');
        } else {
          router.replace('/test-selection');
        }
      } else {
        router.replace('/login');
      }
    }, 500);

    return () => clearTimeout(timeout);
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