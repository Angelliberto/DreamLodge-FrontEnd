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
  
  // Transformar los datos del formato del frontend al formato del backend
  // Frontend: { dimensions: { openness: number, ... }, testType, subfacets?, ... }
  // Backend espera: { entityType: 'user', entityId: ObjectId, scores: { openness: { total: number, ...subfacetas }, ... }, totalScore?: number }
  
  const dimensions = results.dimensions || {};
  const subfacets = results.subfacets || {};
  
  // Construir el objeto scores en el formato esperado por el backend
  // Cada dimensión debe tener al menos el campo 'total'
  const scores: any = {
    openness: { total: dimensions.openness || 0 },
    conscientiousness: { total: dimensions.conscientiousness || 0 },
    extraversion: { total: dimensions.extraversion || 0 },
    agreeableness: { total: dimensions.agreeableness || 0 },
    neuroticism: { total: dimensions.neuroticism || 0 }
  };
  
  // Si hay subfacetas (test profundo), agregarlas al objeto scores
  if (results.testType === 'deep' && subfacets) {
    Object.keys(subfacets).forEach((dimension) => {
      if (scores[dimension] && subfacets[dimension]) {
        // Calcular el promedio de cada subfaceta y agregarlo
        Object.keys(subfacets[dimension]).forEach((subfacet) => {
          const subfacetValues = subfacets[dimension][subfacet];
          if (Array.isArray(subfacetValues) && subfacetValues.length > 0) {
            // Los valores vienen en escala -2 a +2, convertir a 0-5
            const average = subfacetValues.reduce((sum: number, val: number) => sum + val, 0) / subfacetValues.length;
            const normalizedValue = ((average + 2) / 4) * 5;
            scores[dimension][subfacet] = normalizedValue;
          }
        });
      }
    });
  }
  
  // Calcular totalScore como promedio de todas las dimensiones
  const dimensionValues = Object.values(dimensions).filter(v => typeof v === 'number') as number[];
  const totalScore = dimensionValues.length > 0 
    ? dimensionValues.reduce((sum, val) => sum + val, 0) / dimensionValues.length 
    : 0;
  
  // Preparar el payload para el backend
  const payload = {
    entityType: 'user',
    entityId: userId,
    scores,
    totalScore
  };
  
  console.log('Saving test results with payload:', JSON.stringify(payload, null, 2));
  
  const response = await axios.post(
    getBackendEndpoint('/ocean'),
    payload
  );
  return response.data;
}

export async function getUserTestResults(userId: string): Promise<any | null> {
  const token = await getAuthToken();
  if (!token) throw new Error('No autenticado');
  
  try {
    const response = await axios.get(
      getBackendEndpoint(`/ocean/user/${userId}`)
    );
    // Backend returns { data: [...] }, extract the array
    return response.data?.data || response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null; // Usuario no tiene resultados
    }
    throw error;
  }
}
