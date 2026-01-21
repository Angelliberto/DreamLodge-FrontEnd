import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, register as apiRegister, getUserTestResults } from '../services/DL_api/api';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../types';
import { storage } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  hasTestResults: boolean;
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
      console.error('Error cargando sesión:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkTestResultsForUser = async (userId: string) => {
    try {
      const results = await getUserTestResults(userId);
      setHasTestResults(!!results);
    } catch (error) {
      console.error('Error verificando resultados del test:', error);
      setHasTestResults(false);
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
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, hasTestResults, login, register, logout, checkTestResults }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}