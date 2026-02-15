import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { getBackendEndpoint } from '../config/api';
import { login as apiLogin, register as apiRegister, getGoogleSignInUrl, getUserTestResults } from '../services/DL_api/api';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types';
import { storage } from '../utils/storage';

// Complete auth session when app loads
WebBrowser.maybeCompleteAuthSession();

const isWeb = Platform.OS === 'web';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  hasTestResults: boolean;
  hasQuickTest: boolean;
  hasDeepTest: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  googleSignIn: () => Promise<void>;
  logout: () => Promise<void>;
  checkTestResults: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTestResults, setHasTestResults] = useState(false);
  const [hasQuickTest, setHasQuickTest] = useState(false);
  const [hasDeepTest, setHasDeepTest] = useState(false);

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for deep links (when app returns from OAuth flow)
  useEffect(() => {
    if (isWeb) {
      return; // Don't set up deep link listener for web
    }

    console.log('📱 AuthProvider: Setting up deep link listener for mobile');

    // Handle deep links when app is already open
    const subscription = Linking.addEventListener('url', (event) => {
      const { url } = event;
      console.log('🔗 Deep link received:', url);
      
      if (url && url.includes('dreamlodgefrontend://auth')) {
        console.log('✅ Deep link matches Google OAuth pattern');
        handleDeepLinkAuth(url);
      }
    });

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url && url.includes('dreamlodgefrontend://auth')) {
        console.log('🔗 Deep link: Initial URL:', url);
        handleDeepLinkAuth(url);
      }
    }).catch((error) => {
      console.error('Deep link: Error getting initial URL:', error);
    });

    return () => {
      console.log('AuthProvider: Removing deep link listener');
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeepLinkAuth = async (url: string) => {
    try {
      console.log('📱 Processing deep link auth:', url);
      const parsedUrl = Linking.parse(url);
      const token = parsedUrl.queryParams?.token as string;
      const userDataStr = parsedUrl.queryParams?.user as string;

      console.log('📱 Token found:', token ? 'Yes' : 'No');
      console.log('📱 User data found:', userDataStr ? 'Yes' : 'No');

      if (token && userDataStr) {
        console.log('✅ Google Sign-In: Processing token and user data from deep link');
        const user = JSON.parse(decodeURIComponent(userDataStr)) as User;
        await saveSession(token, user);
        await checkTestResultsForUser(user._id);
        console.log('✅ Google Sign-In: Completed successfully via deep link');
      } else {
        console.error('❌ Deep link: Missing token or user data');
      }
    } catch (error: any) {
      console.error('❌ Deep link: Error processing auth:', error);
    }
  };


  const loadSession = async () => {
    try {
      const token = await storage.getItem('userToken');
      const userData = await storage.getItem('userProfile');
      
      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        // Verificar si tiene resultados del test
        await checkTestResultsForUser(parsedUser._id);
      }
    } catch {
      // Error silencioso al cargar sesión
    } finally {
      setIsLoading(false);
    }
  };

  const checkTestResultsForUser = async (userId: string) => {
    try {
      const results = await getUserTestResults(userId);
      
      // Manejar diferentes formatos de respuesta
      let resultsArray: any[] = [];
      if (Array.isArray(results)) {
        resultsArray = results;
      } else if (results && typeof results === 'object' && results.data && Array.isArray(results.data)) {
        resultsArray = results.data;
      } else if (results && typeof results === 'object' && results.scores) {
        // Si es un objeto único con scores, convertirlo a array
        resultsArray = [results];
      }
      
      if (resultsArray.length > 0) {
        setHasTestResults(true);
        // Verificar qué tipos de test tiene el usuario
        const hasQuick = resultsArray.some((r: any) => r.testType === 'quick' || (!r.testType && r.scores));
        const hasDeep = resultsArray.some((r: any) => r.testType === 'deep');
        setHasQuickTest(hasQuick);
        setHasDeepTest(hasDeep);
      } else {
        setHasTestResults(false);
        setHasQuickTest(false);
        setHasDeepTest(false);
      }
    } catch {
      setHasTestResults(false);
      setHasQuickTest(false);
      setHasDeepTest(false);
    }
  };

  const checkTestResults = async () => {
    if (user?._id) {
      await checkTestResultsForUser(user._id);
    }
  };

  const login = async (data: LoginRequest) => {
    try {
      const response: AuthResponse = await apiLogin(data);
      if (response.token) {
        await saveSession(response.token, response.user);
        // Verificar resultados del test después del login
        await checkTestResultsForUser(response.user._id);
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response: AuthResponse = await apiRegister(data);
      if (response.token) {
        await saveSession(response.token, response.user);
        // Usuario nuevo no tiene resultados
        setHasTestResults(false);
      }
    } catch (error) {
      throw error;
    }
  };

  const googleSignIn = async () => {
    try {
      if (isWeb) {
        // For web, use OAuth flow
        const authUrl = getGoogleSignInUrl();
        console.log('🌐 Web: Opening OAuth in same window');
        if (typeof window !== 'undefined') {
          window.location.href = authUrl;
        }
        return;
      } else {
        // For mobile, use WebBrowser.openAuthSessionAsync
        // This opens the system browser which Google accepts (not a WebView)
        const redirectUri = Linking.createURL('auth', { scheme: 'dreamlodgefrontend' });
        const authUrl = getBackendEndpoint(`/users/google?redirect_uri=${encodeURIComponent(redirectUri)}`);
        
        console.log('📱 Mobile: Using WebBrowser.openAuthSessionAsync');
        console.log('📱 Auth URL:', authUrl);
        console.log('📱 Redirect URI:', redirectUri);

        try {
          // Complete any existing auth session first
          WebBrowser.maybeCompleteAuthSession();

          // Open auth session - this uses the system browser, not a WebView
          // Google will accept this because it's a real browser
          const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

          console.log('📱 WebBrowser result type:', result.type);
          const resultUrl = 'url' in result ? result.url : null;
          console.log('📱 WebBrowser result URL:', resultUrl || 'No URL');

          if (result.type === 'success' && resultUrl) {
            // Parse the redirect URL to extract token and user data
            const parsedUrl = Linking.parse(resultUrl);
            const token = parsedUrl.queryParams?.token as string;
            const userDataStr = parsedUrl.queryParams?.user as string;

            console.log('📱 Token found:', token ? 'Yes' : 'No');
            console.log('📱 User data found:', userDataStr ? 'Yes' : 'No');

            if (token && userDataStr) {
              console.log('✅ Google Sign-In: Processing token and user data');
              const user = JSON.parse(decodeURIComponent(userDataStr)) as User;
              await saveSession(token, user);
              await checkTestResultsForUser(user._id);
              console.log('✅ Google Sign-In: Completed successfully');
            } else {
              throw new Error('Missing token or user data in redirect');
            }
          } else if (result.type === 'cancel' || result.type === 'dismiss') {
            console.log('📱 User cancelled or dismissed the login flow');
            return; // Don't throw error for user cancellation
          } else {
            throw new Error(`Authentication failed: ${result.type}`);
          }
        } catch (error: any) {
          console.error('❌ Google Sign-In: Error in WebBrowser:', error);
          throw error;
        }
      }
    } catch (error: any) {
      console.error('❌ Google Sign-In: Error:', error);
      throw error;
    }
  };

  const saveSession = async (token: string, user: User) => {
    await storage.setItem('userToken', token);
    await storage.setItem('userProfile', JSON.stringify(user));
    setUser(user);
  };

  const logout = async () => {
    await storage.removeItem('userToken');
    await storage.removeItem('userProfile');
    setUser(null);
    setHasTestResults(false);
    setHasQuickTest(false);
    setHasDeepTest(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      hasTestResults, 
      hasQuickTest, 
      hasDeepTest,
      login, 
      register, 
      googleSignIn,
      logout, 
      checkTestResults 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}