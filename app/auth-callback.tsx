import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { BackgroundLayout } from '../src/components/ui/BackgroundLayout';
import { exchangeAuthSession } from '../src/services/DL_api/api';
import type { User } from '../src/types';
import { storage } from '../src/utils/storage';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const processAuthCallback = async () => {
      try {
        // Check if this is a secure session-based callback (web) or direct token callback (mobile)
        const sessionCode = params.session as string;
        const token = params.token as string;
        const userDataStr = params.user as string;

        if (sessionCode) {
          // Secure web flow: exchange session code for token
          try {
            const authResponse = await exchangeAuthSession(sessionCode);
            
            if (authResponse.token && authResponse.user) {
              // Save session
              await storage.setItem('userToken', authResponse.token);
              await storage.setItem('userProfile', JSON.stringify(authResponse.user));
              
              // Redirect to home
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              } else {
                router.replace('/');
              }
            } else {
              console.error('Web Auth Callback: Invalid response from session exchange');
              router.replace('/login');
            }
          } catch (exchangeError: any) {
            console.error('Web Auth Callback: Error exchanging session:', exchangeError);
            router.replace('/login');
          }
        } else if (token && userDataStr) {
          // Direct token flow (mobile deep link)
          try {
            const user = JSON.parse(decodeURIComponent(userDataStr)) as User;
            
            // Save session
            await storage.setItem('userToken', token);
            await storage.setItem('userProfile', JSON.stringify(user));
            
            // Redirect to home
            if (typeof window !== 'undefined') {
              window.location.href = '/';
            } else {
              router.replace('/');
            }
          } catch (parseError) {
            console.error('Mobile Auth Callback: Error parsing data:', parseError);
            router.replace('/login');
          }
        } else {
          console.error('Auth Callback: Missing session code or token/user data');
          router.replace('/login');
        }
      } catch (error) {
        console.error('Auth Callback: Error:', error);
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
