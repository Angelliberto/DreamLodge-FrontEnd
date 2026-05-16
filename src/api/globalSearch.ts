import { getBackendEndpoint } from '../config/api';
import type { CulturalItem } from '../types/CulturalItem';

export type GlobalSearchFilters = {
  categories?: string[];
  cinemaType?: 'all' | 'movie' | 'series';
  emotions?: string[];
  genres?: string[];
  author?: string;
  yearFrom?: string;
  yearTo?: string;
};

export type GlobalSearchOptions = {
  signal?: AbortSignal;
  filters?: GlobalSearchFilters;
};

/** Búsqueda global: backend `/api/globalSearch` (mismas claves que feed). */
export async function globalSearch(
  query: string,
  options?: GlobalSearchOptions
): Promise<CulturalItem[]> {
  const q = typeof query === 'string' ? query : '';
  const signal = options?.signal;
  const filters = options?.filters;
  try {
    const base = getBackendEndpoint('/globalSearch');
    const params = new URLSearchParams();
    params.set('q', q);
    if (filters?.categories?.length) params.set('categories', filters.categories.join(','));
    if (filters?.cinemaType && filters.cinemaType !== 'all') params.set('cinemaType', filters.cinemaType);
    if (filters?.emotions?.length) params.set('emotions', filters.emotions.join(','));
    if (filters?.genres?.length) params.set('genres', filters.genres.join(','));
    if (filters?.author && filters.author !== 'all') params.set('author', filters.author);
    if (filters?.yearFrom) params.set('yearFrom', filters.yearFrom);
    if (filters?.yearTo) params.set('yearTo', filters.yearTo);
    const url = `${base}?${params.toString()}`;
    const res = await fetch(url, { signal });
    if (signal?.aborted) return [];
    if (!res.ok) {
      console.warn('globalSearch HTTP', res.status);
      return [];
    }
    const data = (await res.json()) as { items?: CulturalItem[] };
    return Array.isArray(data.items) ? data.items : [];
  } catch (e) {
    if (signal?.aborted || (e instanceof Error && e.name === 'AbortError')) {
      return [];
    }
    console.error('globalSearch', e);
    return [];
  }
}
