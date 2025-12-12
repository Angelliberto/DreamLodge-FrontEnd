// src/services/external_api/music.ts
import { SPOTIFY_API_BASE_URL } from './constants'; 

// Ajusta esto a tu URL real del backend
const PROXY_TOKEN_URL = 'http://localhost:3000/api/spotify/token'; 

// --- CACHÉ EN MEMORIA ---
let cachedToken: string | null = null;
let tokenExpiration: number = 0;

/**
 * Obtiene el Token con caché. Si ya tenemos uno válido, no llama al servidor.
 */
export const getAppAccessToken = async (): Promise<string | null> => {
    const now = Date.now();
    
    // Si existe token y le quedan más de 5 minutos de vida, úsalo
    if (cachedToken && now < tokenExpiration - (5 * 60 * 1000)) {
        return cachedToken;
    }

    try {
        console.log("🎵 Renovando token de Spotify...");
        const response = await fetch(PROXY_TOKEN_URL, { method: 'GET' });

        if (!response.ok) return null;

        const tokenData = await response.json();

        if (tokenData.access_token) {
            cachedToken = tokenData.access_token;
            // Spotify tokens duran 1 hora (3600s). Guardamos expiración.
            tokenExpiration = now + (tokenData.expires_in * 1000); 
            return cachedToken;
        }
        return null;
    } catch (error) {
        console.error('Error obteniendo token Spotify:', error);
        return null;
    }
};

export const makeSpotifyRequest = async (endpoint: string, accessToken: string): Promise<any> => {
    try {
        const response = await fetch(`${SPOTIFY_API_BASE_URL}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (!response.ok) throw new Error(`Spotify API Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Error en request Spotify ${endpoint}:`, error);
        throw error; 
    }
};

export const getAlbumDetailsAndTracks = async (albumId: string, accessToken: string): Promise<any> => {
    // ... (Tu implementación existente para detalles se mantiene igual)
    const response = await fetch(`${SPOTIFY_API_BASE_URL}/albums/${albumId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    return await response.json();
};

/**
 * Búsqueda optimizada usando el token en caché
 */
export const searchSpotifyAlbums = async (query: string): Promise<any[]> => {
    try {
        const token = await getAppAccessToken();
        if (!token) return [];

        // Pedimos solo 6 resultados para aligerar la carga
        const endpoint = `/search?q=${encodeURIComponent(query)}&type=album&limit=6`;
        const data = await makeSpotifyRequest(endpoint, token);

        return data?.albums?.items || [];
    } catch (error) {
        return [];
    }
};