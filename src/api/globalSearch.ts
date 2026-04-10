import { getBackendEndpoint } from '../config/api';
import type { CulturalItem } from '../types/CulturalItem';

export type GlobalSearchOptions = {
  signal?: AbortSignal;
};

/** Búsqueda global: backend `/api/globalSearch` (mismas claves que feed). */
export async function globalSearch(
  query: string,
  options?: GlobalSearchOptions
): Promise<CulturalItem[]> {
  const q = typeof query === 'string' ? query : '';
  const signal = options?.signal;
  try {
    const base = getBackendEndpoint('/globalSearch');
    const url = `${base}?q=${encodeURIComponent(q)}`;
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
