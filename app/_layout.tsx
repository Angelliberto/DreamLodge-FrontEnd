import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";

// KEY SOLUTION: Import global CSS so NativeWind processes it.


import { AuthProvider } from "../src/contexts/AuthContext";

const Layout: React.FC = () => {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (Platform.OS === 'web') {
      return; // Don't handle deep links on web
    }

    // Handle deep links for reset-password
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;

      // Check if it's a reset-password deep link
      if (url && url.includes('dreamlodgefrontend://reset-password')) {
        try {
          const parsedUrl = Linking.parse(url);
          const token = parsedUrl.queryParams?.token as string;
          
          if (token) {
            // Use replace to avoid back navigation issues
            // Small delay to ensure router is ready
            setTimeout(() => {
              router.replace(`/reset-password?token=${encodeURIComponent(token)}`);
            }, 100);
          }
        } catch {
          // Silent error
        }
      }
    };

    // Listen for deep links when app is already open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    }).catch(() => {
      // Silent error
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            // Dark background by default to avoid white flashes
            contentStyle: { backgroundColor: '#020617' } 
          }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default Layout;