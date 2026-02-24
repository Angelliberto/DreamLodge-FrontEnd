import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { BackgroundLayout } from '../src/components/ui/BackgroundLayout';
import type { User } from '../src/types';
import { storage } from '../src/utils/storage';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const processAuthCallback = async () => {
      try {
        const token = params.token as string;
        const userDataStr = params.user as string;

        if (token && userDataStr) {
          try {
            const user = JSON.parse(decodeURIComponent(userDataStr)) as User;
            
            // Save session
            await storage.setItem('userToken', token);
            await storage.setItem('userProfile', JSON.stringify(user));
            
            // Reload the page to trigger AuthContext to load the session
            // The AuthContext will handle the redirect based on test results
            if (typeof window !== 'undefined') {
              window.location.href = '/';
            } else {
              router.replace('/');
            }
          } catch (parseError) {
            console.error('Web Auth Callback: Error parsing data:', parseError);
            router.replace('/login');
          }
        } else {
          console.error('Web Auth Callback: Missing token or user data');
          router.replace('/login');
        }
      } catch (error) {
        console.error(' Web Auth Callback: Error:', error);
        router.replace('/login');
      }
    };

    processAuthCallback();
  }, [params, router]);

  return (
    <BackgroundLayout>
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#c084fc" />
      </View>
    </BackgroundLayout>
  );
}
