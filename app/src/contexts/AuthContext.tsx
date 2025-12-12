import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, register as apiRegister } from '../services/DL_api/api';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      // Por simplicidad guardamos el perfil básico en local, 
      // idealmente podrías llamar a un endpoint /me con el token
      const userData = await SecureStore.getItemAsync('userProfile');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error cargando sesión:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (data: LoginRequest) => {
    try {
      const response: AuthResponse = await apiLogin(data);
      if (response.token) {
        await saveSession(response.token, response.user);
      }
    } catch (error) {
      throw error; // Re-lanzamos para que el Modal maneje la alerta visual
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response: AuthResponse = await apiRegister(data);
      if (response.token) {
        await saveSession(response.token, response.user);
      }
    } catch (error) {
      throw error;
    }
  };

  const saveSession = async (token: string, user: User) => {
    await SecureStore.setItemAsync('userToken', token);
    await SecureStore.setItemAsync('userProfile', JSON.stringify(user));
    setUser(user);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userProfile');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}