import axios from 'axios';
import { Platform } from 'react-native';
import { getBackendEndpoint } from "../../config/api";
import { AuthResponse, LoginRequest, RegisterRequest } from "../../types";
import { CulturalItem } from "../../types/CulturalItem";
import { cache } from '../../utils/cache';
import { storage } from '../../utils/storage';

// Helper function to get the token
const getAuthToken = async (): Promise<string | null> => {
  return await storage.getItem('userToken');
};

// Configure axios interceptor to automatically add token
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

// Response interceptor to handle authentication errors
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Invalid or expired token - clear session
      await storage.removeItem('userToken');
      await storage.removeItem('userProfile');
    }
    return Promise.reject(error);
  }
);

export async function login(data:LoginRequest): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(getBackendEndpoint('/users/login'), data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}

export async function register(data:RegisterRequest): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(getBackendEndpoint('/users/register'), data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}

export async function saveTestResults(userId: string, results: any): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  
  // Transform data from frontend format to backend format
  // Frontend: { dimensions: { openness: number, ... }, testType, subfacets?, ... }
  // Backend expects: { entityType: 'user', entityId: ObjectId, scores: { openness: { total: number, ...subfacets }, ... }, totalScore?: number }
  
  const dimensions = results.dimensions || {};
  const subfacets = results.subfacets || {};
  
  // Build the scores object in the format expected by the backend
  // Each dimension must have at least the 'total' field
  const scores: any = {
    openness: { total: dimensions.openness || 0 },
    conscientiousness: { total: dimensions.conscientiousness || 0 },
    extraversion: { total: dimensions.extraversion || 0 },
    agreeableness: { total: dimensions.agreeableness || 0 },
    neuroticism: { total: dimensions.neuroticism || 0 }
  };
  
  // If there are subfacets (deep test), add them to the scores object
  if (results.testType === 'deep' && subfacets) {
    Object.keys(subfacets).forEach((dimension) => {
      if (scores[dimension] && subfacets[dimension]) {
        // Calculate the average of each subfacet and add it
        Object.keys(subfacets[dimension]).forEach((subfacet) => {
          const subfacetValues = subfacets[dimension][subfacet];
          if (Array.isArray(subfacetValues) && subfacetValues.length > 0) {
            // Values come in scale -2 to +2, convert to 0-5
            const average = subfacetValues.reduce((sum: number, val: number) => sum + val, 0) / subfacetValues.length;
            const normalizedValue = ((average + 2) / 4) * 5;
            scores[dimension][subfacet] = normalizedValue;
          }
        });
      }
    });
  }
  
  // Calculate totalScore as average of all dimensions
  const dimensionValues = Object.values(dimensions).filter(v => typeof v === 'number') as number[];
  const totalScore = dimensionValues.length > 0 
    ? dimensionValues.reduce((sum, val) => sum + val, 0) / dimensionValues.length 
    : 0;
  
  // Prepare the payload for the backend
  const payload = {
    entityType: 'user',
    entityId: userId,
    scores,
    totalScore,
    testType: results.testType || 'quick'
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
  if (!token) throw new Error('Not authenticated');
  
  // Check cache first
  const cacheKey = `testResults:${userId}`;
  const cached = cache.get<any>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await axios.get(
      getBackendEndpoint(`/ocean/user/${userId}`)
    );
    // Backend returns { data: [...] }, extract the array
    const data = response.data?.data || response.data;
    
    // Save to cache (10 minutes - test results don't change frequently)
    if (data) {
      cache.set(cacheKey, data, 10 * 60 * 1000);
    }
    
    return data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null; // User has no results
    }
    throw error;
  }
}

export function getGoogleSignInUrl(): string {
  // For web, use HTTP URL; for mobile, use deep link
  // Always default to deep link unless explicitly on web
  let redirectUri: string;
  
  // Check if we're on web platform
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // Use current origin + /auth-callback for web
    const origin = window.location.origin;
    redirectUri = `${origin}/auth-callback`;
    console.log('getGoogleSignInUrl: Using web redirect URI:', redirectUri);
  } else {
    // Use deep link for mobile (iOS, Android, or any non-web platform)
    redirectUri = 'dreamlodgefrontend://auth';
    console.log('getGoogleSignInUrl: Using mobile deep link:', redirectUri);
  }
  
  return getBackendEndpoint(`/users/google?redirect_uri=${encodeURIComponent(redirectUri)}`);
}

export async function googleSignInWithToken(idToken: string): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(
    getBackendEndpoint('/users/google/token'),
    { token: idToken }
  );
  return response.data;
}

export async function sendPasswordResetEmail(email: string): Promise<{ message: string }> {
  const response = await axios.post<{ message: string }>(
    getBackendEndpoint('/users/forgot-password'),
    { email }
  );
  return response.data;
}

export async function checkPasswordResetToken(token: string): Promise<{ message: string }> {
  const response = await axios.get<{ message: string }>(
    getBackendEndpoint(`/users/check-reset-token?token=${encodeURIComponent(token)}`)
  );
  return response.data;
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  const response = await axios.post<{ message: string }>(
    getBackendEndpoint('/users/reset-password'),
    { token, newPassword }
  );
  return response.data;
}

export async function getArtworkById(id: string): Promise<any> {
  const response = await axios.get(
    getBackendEndpoint(`/artworks/${id}`)
  );
  return response.data?.data || response.data;
}

// ==================== FAVORITES ====================

/**
 * Add an artwork to favorites
 * @param artwork - Artwork data to add
 */
export async function addToFavorites(artwork: CulturalItem): Promise<{ message: string; data: { artworkId: string } }> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  
  const response = await axios.post(
    getBackendEndpoint('/artworks/favorites'),
    { artwork }
  );
  
  // Invalidate favorites cache
  cache.delete('favorites');
  
  return response.data;
}

/**
 * Remove an artwork from favorites
 * @param artworkId - Artwork ID (MongoDB ObjectId)
 */
export async function removeFromFavorites(artworkId: string): Promise<{ message: string; data: { favoriteArtworks: any[] } }> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  
  const response = await axios.delete(
    getBackendEndpoint(`/artworks/favorites/${artworkId}`)
  );
  
  // Invalidate favorites cache
  cache.delete('favorites');
  
  return response.data;
}

/**
 * Get all favorite artworks of the user
 */
export async function getFavorites(): Promise<CulturalItem[]> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  
  // Check cache first
  const cacheKey = 'favorites';
  const cached = cache.get<CulturalItem[]>(cacheKey);
  if (cached) {
    return cached;
  }
  
  const response = await axios.get(
    getBackendEndpoint('/artworks/favorites')
  );
  const data = response.data?.data || [];
  
  // Save to cache (10 minutes - favorites don't change frequently)
  cache.set(cacheKey, data, 10 * 60 * 1000);
  
  return data;
}

// ==================== PENDING ====================

/**
 * Add an artwork to pending
 * @param artwork - Artwork data to add
 */
export async function addToPending(artwork: CulturalItem): Promise<{ message: string; data: { artworkId: string } }> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  
  const response = await axios.post(
    getBackendEndpoint('/artworks/pending'),
    { artwork }
  );
  
  // Invalidate pending cache
  cache.delete('pending');
  
  return response.data;
}

/**
 * Remove an artwork from pending
 * @param artworkId - Artwork ID (MongoDB ObjectId)
 */
export async function removeFromPending(artworkId: string): Promise<{ message: string; data: { pendingArtworks: any[] } }> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  
  const response = await axios.delete(
    getBackendEndpoint(`/artworks/pending/${artworkId}`)
  );
  
  // Invalidate pending cache
  cache.delete('pending');
  
  return response.data;
}

/**
 * Get all pending artworks of the user
 */
export async function getPending(): Promise<CulturalItem[]> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  
  // Check cache first
  const cacheKey = 'pending';
  const cached = cache.get<CulturalItem[]>(cacheKey);
  if (cached) {
    return cached;
  }
  
  const response = await axios.get(
    getBackendEndpoint('/artworks/pending')
  );
  const data = response.data?.data || [];
  
  // Save to cache (10 minutes - pending don't change frequently)
  cache.set(cacheKey, data, 10 * 60 * 1000);
  
  return data;
}
