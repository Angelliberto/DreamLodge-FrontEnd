// config/api.ts
// Configuración centralizada de URLs y constantes de la API

import Constants from 'expo-constants';
import type { ExtraConfig } from '../types/env';

// Intenta leer la configuración de múltiples formas (para compatibilidad con web/native)
const extra = (Constants.expoConfig?.extra || Constants.manifest?.extra || Constants.manifest2?.extra) as ExtraConfig;

/**
 * URL base del backend de Dream Lodge
 * Se obtiene de app.json -> extra.BACKEND_URL
 * Si no está definida, usa localhost como fallback para desarrollo
 */
export const BACKEND_URL = extra?.BACKEND_URL || 'https://impressive-cathee-immune-angelceb-312ac472.koyeb.app';


/**
 * URL base para endpoints específicos del backend
 */
export const getBackendEndpoint = (path: string): string => {
  // Asegura que el path empiece con /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Normaliza BACKEND_URL: remueve slashes finales
  let baseUrl = BACKEND_URL.replace(/\/+$/, '');
  
  // Si BACKEND_URL ya termina con /api, úsalo directamente
  // Si no, agrega /api
  if (!baseUrl.endsWith('/api')) {
    baseUrl = `${baseUrl}/api`;
  }
  
  // Construye la URL final
  const finalUrl = `${baseUrl}${cleanPath}`;
  return finalUrl;
};

/**
 * TMDB API Key
 */
export const TMDB_API_KEY = extra?.TMDB_API_KEY || '';

/**
 * Spotify Client ID
 */
export const SPOTIFY_CLIENT_ID = extra?.SPOTIFY_CLIENT_ID || '';
