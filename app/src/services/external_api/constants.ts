// constants.ts

import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as any; 

export const SPOTIFY_CLIENT_ID = extra.SPOTIFY_CLIENT_ID;
// SPOTIFY_CLIENT_SECRET se mantiene oculto en el backend

export const SPOTIFY_SCOPES = [
    'user-read-private', 
    'user-read-email', 
    'user-top-read', 
    'playlist-read-private'
];

// URL BASE REAL para las solicitudes de datos
export const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1/';