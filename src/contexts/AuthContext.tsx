import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, register as apiRegister, getUserTestResults } from '../services/DL_api/api';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../types';
import { storage } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  hasTestResults: boolean;
  hasQuickTest: boolean;
  hasDeepTest: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
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
  }, []);

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
    } catch (error) {
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
    } catch (error) {
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