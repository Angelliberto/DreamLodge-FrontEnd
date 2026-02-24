import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { getBackendEndpoint } from '../config/api';
import { login as apiLogin, register as apiRegister, getGoogleSignInUrl, getUserTestResults } from '../services/DL_api/api';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types';
import { cache } from '../utils/cache';
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

    // Handle deep links when app is already open
    const subscription = Linking.addEventListener('url', (event) => {
      const { url } = event;
      
      if (url && url.includes('dreamlodgefrontend://auth')) {
        handleDeepLinkAuth(url);
      }
    });

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url && url.includes('dreamlodgefrontend://auth')) {
        handleDeepLinkAuth(url);
      }
    }).catch(() => {
      // Silent error
    });

    return () => {
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeepLinkAuth = async (url: string) => {
    try {
      const parsedUrl = Linking.parse(url);
      const token = parsedUrl.queryParams?.token as string;
      const userDataStr = parsedUrl.queryParams?.user as string;

      if (token && userDataStr) {
        const user = JSON.parse(decodeURIComponent(userDataStr)) as User;
        await saveSession(token, user);
        await checkTestResultsForUser(user._id);
      }
    } catch {
      // Silent error
    }
  };


  const loadSession = async () => {
    try {
      const token = await storage.getItem('userToken');
      const userData = await storage.getItem('userProfile');
      
      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        // Check if user has test results
        await checkTestResultsForUser(parsedUser._id);
      }
    } catch {
      // Silent error when loading session
    } finally {
      setIsLoading(false);
    }
  };

  const checkTestResultsForUser = useCallback(async (userId: string) => {
    try {
      // Check cache first to avoid unnecessary calls
      const cacheKey = `testResults:${userId}`;
      const cached = cache.get<any>(cacheKey);
      
      let results: any = cached;
      if (!cached) {
        results = await getUserTestResults(userId);
      }
      
      // Handle different response formats
      let resultsArray: any[] = [];
      if (Array.isArray(results)) {
        resultsArray = results;
      } else if (results && typeof results === 'object' && results.data && Array.isArray(results.data)) {
        resultsArray = results.data;
      } else if (results && typeof results === 'object' && results.scores) {
        // If it's a single object with scores, convert it to array
        resultsArray = [results];
      }
      
      if (resultsArray.length > 0) {
        setHasTestResults(true);
        // Check what types of tests the user has
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
  }, []);

  const saveSession = useCallback(async (token: string, user: User) => {
    await storage.setItem('userToken', token);
    await storage.setItem('userProfile', JSON.stringify(user));
    setUser(user);
  }, []);

  const checkTestResults = useCallback(async () => {
    if (user?._id) {
      await checkTestResultsForUser(user._id);
    }
  }, [user?._id, checkTestResultsForUser]);

  const login = useCallback(async (data: LoginRequest) => {
    try {
      const response: AuthResponse = await apiLogin(data);
      if (response.token) {
        await saveSession(response.token, response.user);
        // Check test results after login
        await checkTestResultsForUser(response.user._id);
      }
    } catch (error) {
      throw error;
    }
  }, [checkTestResultsForUser, saveSession]);

  const register = useCallback(async (data: RegisterRequest) => {
    try {
      const response: AuthResponse = await apiRegister(data);
      if (response.token) {
        await saveSession(response.token, response.user);
        // New user has no results
        setHasTestResults(false);
      }
    } catch (error) {
      throw error;
    }
  }, [saveSession]);

  const googleSignIn = useCallback(async () => {
    try {
      if (isWeb) {
        // For web, use OAuth flow
        const authUrl = getGoogleSignInUrl();
        if (typeof window !== 'undefined') {
          window.location.href = authUrl;
        }
        return;
      } else {
        // For mobile, use WebBrowser.openAuthSessionAsync
        // This opens the system browser which Google accepts (not a WebView)
        const redirectUri = Linking.createURL('auth', { scheme: 'dreamlodgefrontend' });
        const authUrl = getBackendEndpoint(`/users/google?redirect_uri=${encodeURIComponent(redirectUri)}`);

        try {
          // Complete any existing auth session first
          WebBrowser.maybeCompleteAuthSession();

          // Open auth session - this uses the system browser, not a WebView
          // Google will accept this because it's a real browser
          const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

          const resultUrl = 'url' in result ? result.url : null;

          if (result.type === 'success' && resultUrl) {
            // Parse the redirect URL to extract token and user data
            const parsedUrl = Linking.parse(resultUrl);
            const token = parsedUrl.queryParams?.token as string;
            const userDataStr = parsedUrl.queryParams?.user as string;

            if (token && userDataStr) {
              const user = JSON.parse(decodeURIComponent(userDataStr)) as User;
              await saveSession(token, user);
              await checkTestResultsForUser(user._id);
            } else {
              throw new Error('Missing token or user data in redirect');
            }
          } else if (result.type === 'cancel' || result.type === 'dismiss') {
            return; // Don't throw error for user cancellation
          } else {
            throw new Error(`Authentication failed: ${result.type}`);
          }
        } catch (error: any) {
          throw error;
        }
      }
    } catch (error: any) {
      throw error;
    }
  }, [checkTestResultsForUser, saveSession]);

  const logout = useCallback(async () => {
    await storage.removeItem('userToken');
    await storage.removeItem('userProfile');
    // Clear user-related cache
    cache.deleteByPattern(/^favorites|^pending|^testResults:/);
    // Clear chat current conversation
    await storage.removeItem('chat_current_conversation');
    setUser(null);
    setHasTestResults(false);
    setHasQuickTest(false);
    setHasDeepTest(false);
  }, []);

  // Memoize context value to avoid unnecessary re-renders
  const contextValue = useMemo(() => ({
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
  }), [user, isLoading, hasTestResults, hasQuickTest, hasDeepTest, login, register, googleSignIn, logout, checkTestResults]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}