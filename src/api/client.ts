import axios from 'axios';
import { Platform } from 'react-native';
import { getBackendEndpoint } from '../config/api';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types';
import type { CulturalItem } from '../types/CulturalItem';
import { CACHE_TTL, cache } from '../utils/cache';
import { readCachedStaleWhileRevalidate } from '../utils/staleWhileRevalidate';
import { storage } from '../utils/storage';

const getAuthToken = async (): Promise<string | null> => storage.getItem('userToken');

axios.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await storage.removeItem('userToken');
      await storage.removeItem('userProfile');
    }
    return Promise.reject(error);
  }
);

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(getBackendEndpoint('/users/login'), data, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(getBackendEndpoint('/users/register'), data, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
}

export async function verifyEmailCode(
  email: string,
  code: string
): Promise<{ message: string }> {
  const response = await axios.post<{ message: string }>(
    getBackendEndpoint('/users/verify-email'),
    { email, code }
  );
  return response.data;
}

export async function resendVerificationCode(
  email: string
): Promise<{ message: string }> {
  const response = await axios.post<{ message: string }>(
    getBackendEndpoint('/users/resend-verification-code'),
    { email }
  );
  return response.data;
}

export function invalidateArtisticDescriptionCache(userId: string): void {
  cache.delete(`artisticDescription:${userId}`);
}

export function invalidatePersonalizedFeedCache(): void {
  cache.deleteByPattern(/^personalizedFeed:/);
}

/** Limpia caché en memoria de listas de usuario para forzar datos recientes al volver a perfil/feed. */
export function invalidateUserArtworkListCaches(): void {
  cache.delete('favorites');
  cache.delete('pending');
  cache.delete('notInterested');
}

export async function saveTestResults(userId: string, results: any): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const dimensions = results.dimensions || {};
  const subfacets = results.subfacets || {};

  const scores: any = {
    openness: { total: dimensions.openness || 0 },
    conscientiousness: { total: dimensions.conscientiousness || 0 },
    extraversion: { total: dimensions.extraversion || 0 },
    agreeableness: { total: dimensions.agreeableness || 0 },
    neuroticism: { total: dimensions.neuroticism || 0 },
  };

  if (results.testType === 'deep' && subfacets) {
    Object.keys(subfacets).forEach((dimension) => {
      if (scores[dimension] && subfacets[dimension]) {
        Object.keys(subfacets[dimension]).forEach((subfacet) => {
          const subfacetValues = subfacets[dimension][subfacet];
          if (Array.isArray(subfacetValues) && subfacetValues.length > 0) {
            const average =
              subfacetValues.reduce((sum: number, val: number) => sum + val, 0) /
              subfacetValues.length;
            const normalizedValue = ((average + 2) / 4) * 5;
            scores[dimension][subfacet] = normalizedValue;
          }
        });
      }
    });
  }

  const dimensionValues = Object.values(dimensions).filter((v) => typeof v === 'number') as number[];
  const totalScore =
    dimensionValues.length > 0
      ? dimensionValues.reduce((sum, val) => sum + val, 0) / dimensionValues.length
      : 0;

  const payload = {
    entityType: 'user',
    entityId: userId,
    scores,
    totalScore,
    testType: results.testType || 'quick',
  };

  await axios.post(getBackendEndpoint('/ocean'), payload);

  cache.delete(`testResults:${userId}`);
  invalidateArtisticDescriptionCache(userId);
  invalidatePersonalizedFeedCache();
}

export async function getUserTestResults(userId: string): Promise<any | null> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const cacheKey = `testResults:${userId}`;
  const cached = cache.get<any>(cacheKey);
  if (cached) return cached;

  try {
    const response = await axios.get(getBackendEndpoint(`/ocean/user/${userId}`));
    const data = response.data?.data || response.data;
    if (data) {
      cache.set(cacheKey, data, CACHE_TTL.testResults);
    }
    return data;
  } catch (error: any) {
    if (error.response?.status === 404) return null;
    throw error;
  }
}

export function getGoogleSignInUrl(): string {
  let redirectUri: string;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    redirectUri = `${window.location.origin}/auth-callback`;
  } else {
    redirectUri = 'dreamlodgefrontend://auth';
  }
  return getBackendEndpoint(`/users/google?redirect_uri=${encodeURIComponent(redirectUri)}`);
}

export async function googleSignInWithToken(idToken: string): Promise<AuthResponse> {
  const response = await axios.post<AuthResponse>(getBackendEndpoint('/users/google/token'), {
    token: idToken,
  });
  return response.data;
}

export async function exchangeAuthSession(sessionCode: string): Promise<AuthResponse> {
  const response = await axios.get<AuthResponse>(
    getBackendEndpoint(`/users/google/exchange?session=${encodeURIComponent(sessionCode)}`)
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

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ message: string }> {
  const response = await axios.post<{ message: string }>(
    getBackendEndpoint('/users/reset-password'),
    { token, newPassword }
  );
  return response.data;
}

export async function getArtworkById(id: string): Promise<any> {
  const response = await axios.get(getBackendEndpoint(`/artworks/${id}`));
  return response.data?.data || response.data;
}

export async function getSimilarArtworks(
  artwork: Partial<CulturalItem>,
  options?: { limit?: number; targetCategory?: CulturalItem['category']; timeoutMs?: number }
): Promise<CulturalItem[]> {
  if (!artwork?.title || !artwork?.category) return [];
  const response = await axios.post(
    getBackendEndpoint('/artworks/similar'),
    {
      artwork,
      limit: options?.limit ?? 3,
      targetCategory: options?.targetCategory,
    },
    { timeout: options?.timeoutMs ?? 12000 }
  );
  const items = response.data?.data?.items;
  return Array.isArray(items) ? items : [];
}

export async function addToFavorites(
  artwork: CulturalItem
): Promise<{ message: string; data: { artworkId: string } }> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const response = await axios.post(getBackendEndpoint('/artworks/favorites'), { artwork });
  cache.delete('favorites');
  return response.data;
}

export async function removeFromFavorites(
  artworkId: string
): Promise<{ message: string; data: { favoriteArtworks: any[] } }> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const response = await axios.delete(getBackendEndpoint(`/artworks/favorites/${artworkId}`));
  cache.delete('favorites');
  return response.data;
}

export async function getFavorites(): Promise<CulturalItem[]> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const cacheKey = 'favorites';
  return readCachedStaleWhileRevalidate<CulturalItem[]>(cacheKey, CACHE_TTL.userLists, async () => {
    const response = await axios.get(getBackendEndpoint('/artworks/favorites'));
    return response.data?.data || [];
  });
}

export async function addToPending(
  artwork: CulturalItem
): Promise<{ message: string; data: { artworkId: string } }> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const response = await axios.post(getBackendEndpoint('/artworks/pending'), { artwork });
  cache.delete('pending');
  return response.data;
}

export async function removeFromPending(
  artworkId: string
): Promise<{ message: string; data: { pendingArtworks: any[] } }> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const response = await axios.delete(getBackendEndpoint(`/artworks/pending/${artworkId}`));
  cache.delete('pending');
  return response.data;
}

export async function getPending(): Promise<CulturalItem[]> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const cacheKey = 'pending';
  return readCachedStaleWhileRevalidate<CulturalItem[]>(cacheKey, CACHE_TTL.userLists, async () => {
    const response = await axios.get(getBackendEndpoint('/artworks/pending'));
    return response.data?.data || [];
  });
}

export async function getNotInterested(): Promise<CulturalItem[]> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const cacheKey = 'notInterested';
  return readCachedStaleWhileRevalidate<CulturalItem[]>(cacheKey, CACHE_TTL.userLists, async () => {
    const response = await axios.get(getBackendEndpoint('/artworks/not-interested'));
    return response.data?.data || [];
  });
}

export async function addToNotInterested(
  artwork: CulturalItem
): Promise<{ message: string; data: { artworkId: string } }> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const response = await axios.post(getBackendEndpoint('/artworks/not-interested'), { artwork });
  cache.delete('notInterested');
  invalidatePersonalizedFeedCache();
  return response.data;
}

export async function removeFromNotInterested(
  artworkMongoId: string
): Promise<{ message: string; data: { notInterestedArtworks?: unknown[] } }> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  const response = await axios.delete(
    getBackendEndpoint(`/artworks/not-interested/${encodeURIComponent(artworkMongoId)}`)
  );
  cache.delete('notInterested');
  invalidatePersonalizedFeedCache();
  return response.data;
}

export type ArtisticSuggestedWork = {
  category: string;
  title: string;
  creator?: string;
};

export const ARTISTIC_GENRE_KEYS = [
  'cine',
  'musica',
  'literatura',
  'videojuegos',
  'arte-visual'
] as const;

export type GenreRecommendationsByCategory = Partial<
  Record<(typeof ARTISTIC_GENRE_KEYS)[number], string[]>
>;

export type ArtisticDescriptionPayload = {
  profile: string;
  description: string;
  /** @deprecated Prefer genreRecommendations; mantenido por respuestas antiguas del backend */
  recommendations: string[];
  genreRecommendations?: GenreRecommendationsByCategory;
  suggestedWorks?: ArtisticSuggestedWork[];
};

function normalizeGenreRecommendations(
  raw: unknown
): GenreRecommendationsByCategory | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const out: GenreRecommendationsByCategory = {};
  for (const k of ARTISTIC_GENRE_KEYS) {
    const arr = o[k];
    if (!Array.isArray(arr)) continue;
    const cleaned = arr.map((x) => String(x).trim()).filter((x) => x.length > 0);
    if (cleaned.length) out[k] = cleaned;
  }
  return Object.keys(out).length ? out : undefined;
}

function normalizeArtisticPayload(raw: Record<string, unknown> | null | undefined): ArtisticDescriptionPayload {
  const rec = Array.isArray(raw?.recommendations) ? raw.recommendations : [];
  const worksRaw = Array.isArray(raw?.suggestedWorks) ? raw.suggestedWorks : [];
  const suggestedWorks: ArtisticSuggestedWork[] = [];
  const seenWorks = new Set<string>();
  const allowedCat = new Set(['cine', 'musica', 'literatura', 'videojuegos', 'arte-visual']);

  for (const w of worksRaw) {
    if (!w || typeof w !== 'object') continue;
    const o = w as Record<string, unknown>;
    const category = typeof o.category === 'string' ? o.category.trim().toLowerCase() : '';
    const title = typeof o.title === 'string' ? o.title.trim() : '';
    if (!allowedCat.has(category) || title.length < 2) continue;
    const creator =
      typeof o.creator === 'string' && o.creator.trim().length > 0
        ? o.creator.trim().slice(0, 120)
        : undefined;
    const key = `${category}:${title.toLowerCase()}`;
    if (seenWorks.has(key)) continue;
    seenWorks.add(key);
    const row: ArtisticSuggestedWork = { category, title: title.slice(0, 200) };
    if (creator) row.creator = creator;
    suggestedWorks.push(row);
    if (suggestedWorks.length >= 20) break;
  }

  return {
    profile: typeof raw?.profile === 'string' ? raw.profile : 'Equilibrado',
    description:
      typeof raw?.description === 'string'
        ? raw.description
        : 'Tu análisis de personalidad se está generando...',
    recommendations: rec.filter((x): x is string => typeof x === 'string'),
    genreRecommendations: normalizeGenreRecommendations(raw?.genreRecommendations),
    suggestedWorks: suggestedWorks.length > 0 ? suggestedWorks : undefined,
  };
}

export async function generateArtisticDescription(
  userId: string,
  options?: { force?: boolean }
): Promise<ArtisticDescriptionPayload> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const cacheKey = `artisticDescription:${userId}`;
  if (options?.force) {
    cache.delete(cacheKey);
    invalidatePersonalizedFeedCache();
  }

  const cached = cache.get<ArtisticDescriptionPayload>(cacheKey);
  if (cached && !options?.force) return cached;

  const response = await axios.post(
    getBackendEndpoint(`/ocean/user/${userId}/artistic-description`),
    options?.force ? { forceRegenerate: true } : {}
  );
  const data = normalizeArtisticPayload((response.data?.data || {}) as Record<string, unknown>);
  cache.set(cacheKey, data, CACHE_TTL.artisticDescription);
  return data;
}

export type PersonalizedFeedCuratedPayload = {
  items: CulturalItem[];
  oceanItems?: CulturalItem[];
  recommendationMode?: 'ocean' | 'favorites';
  webSearchUsed?: boolean;
  reason?: string;
  cached?: boolean;
  /** Respuesta rápida mientras el servidor termina la curación completa en segundo plano */
  partial?: boolean;
  refreshing?: boolean;
  source?: string;
};

const PARTIAL_FEED_CACHE_MS = 4_000;

export async function fetchPersonalizedFeedCurated(options?: {
  force?: boolean;
  anchorsOnly?: boolean;
  preferFavorites?: boolean;
  userId?: string;
  /** Ignora caché en memoria (útil para reintentos tras respuesta partial del servidor). */
  noCache?: boolean;
}): Promise<PersonalizedFeedCuratedPayload> {
  const token = await getAuthToken();
  if (!token) throw new Error('Not authenticated');
  let cacheUserId = String(options?.userId || '').trim();
  if (!cacheUserId) {
    try {
      const rawProfile = await storage.getItem('userProfile');
      if (rawProfile) {
        const parsed = JSON.parse(rawProfile) as { _id?: string };
        if (parsed && typeof parsed._id === 'string') {
          cacheUserId = parsed._id.trim();
        }
      }
    } catch {
      // Ignore profile parse errors; fallback to anon cache scope.
    }
  }
  const cacheKey = `personalizedFeed:${cacheUserId || 'anon'}:${options?.force ? 1 : 0}:${options?.anchorsOnly ? 1 : 0}:${options?.preferFavorites ? 1 : 0}`;
  if (options?.force || options?.noCache) {
    cache.delete(cacheKey);
  } else {
    const cached = cache.get<PersonalizedFeedCuratedPayload>(cacheKey);
    if (cached) return cached;
  }
  const params: Record<string, string | number> = {};
  if (options?.force) params.force = 1;
  if (options?.anchorsOnly) params.anchorsOnly = 1;
  if (options?.preferFavorites) params.preferFavorites = 1;
  const response = await axios.get<{
    message?: string;
    data: PersonalizedFeedCuratedPayload;
  }>(getBackendEndpoint('/feed/personalized'), { params });
  const payload = response.data?.data;
  if (!payload) {
    return { items: [], reason: 'empty_response' };
  }
  if (!Array.isArray(payload.items)) {
    return { ...payload, items: [] };
  }
  const baseTtl = options?.anchorsOnly ? CACHE_TTL.personalizedFeedAnchors : CACHE_TTL.personalizedFeed;
  const ttl = payload.partial ? PARTIAL_FEED_CACHE_MS : baseTtl;
  cache.set(cacheKey, payload, ttl);
  return payload;
}
