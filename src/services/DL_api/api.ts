import axios from 'axios';
import { getBackendEndpoint } from "../../config/api";
import { AuthResponse, LoginRequest, RegisterRequest } from "../../types";
import { storage } from '../../utils/storage';

// Función helper para obtener el token
const getAuthToken = async (): Promise<string | null> => {
  return await storage.getItem('userToken');
};

// Configurar interceptor de axios para agregar token automáticamente
axios.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuesta para manejar errores de autenticación
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token inválido o expirado - limpiar sesión
      await storage.removeItem('userToken');
      await storage.removeItem('userProfile');
    }
    return Promise.reject(error);
  }
);

export async function login(data:LoginRequest): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(getBackendEndpoint('/users/login'), data);
  return response.data;
}

export async function register(data:RegisterRequest): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(getBackendEndpoint('/users/register'), data);
  return response.data;
}

export async function saveTestResults(userId: string, results: any): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error('No autenticado');
  
  const response = await axios.post(
    getBackendEndpoint('/users/test-results'),
    { userId, results }
  );
  return response.data;
}

export async function getUserTestResults(userId: string): Promise<any | null> {
  const token = await getAuthToken();
  if (!token) throw new Error('No autenticado');
  
  try {
    const response = await axios.get(
      getBackendEndpoint(`/users/${userId}/test-results`)
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null; // Usuario no tiene resultados
    }
    throw error;
  }
}
