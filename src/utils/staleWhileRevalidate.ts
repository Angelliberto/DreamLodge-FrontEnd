import { cache } from './cache';

const revalidateInflight = new Map<string, Promise<void>>();

/**
 * Devuelve datos en caché al instante y refresca en segundo plano (estilo Instagram / SWR).
 * No sustituye a `invalidateUserArtworkListCaches` tras mutaciones explícitas.
 */
export async function readCachedStaleWhileRevalidate<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = cache.get<T>(key);
  if (cached != null) {
    if (!revalidateInflight.has(key)) {
      const p = fetcher()
        .then((fresh) => {
          cache.set(key, fresh, ttlMs);
        })
        .catch(() => undefined)
        .finally(() => {
          revalidateInflight.delete(key);
        });
      revalidateInflight.set(key, p);
    }
    return cached;
  }
  const fresh = await fetcher();
  cache.set(key, fresh, ttlMs);
  return fresh;
}
