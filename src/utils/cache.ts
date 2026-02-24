// src/utils/cache.ts
// Sistema de caché simple en memoria con expiración y límite de tamaño

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // milisegundos
  accessCount: number; // Contador de accesos para LRU
  lastAccess: number; // Último acceso para LRU
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number = 100; // Límite máximo de entradas
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
    this.startCleanupInterval();
  }

  /**
   * Obtiene un valor del caché si existe y no ha expirado
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.expiresIn) {
      // Expiró, eliminar del caché
      this.cache.delete(key);
      return null;
    }

    // Actualizar estadísticas de acceso (LRU)
    entry.accessCount++;
    entry.lastAccess = now;

    return entry.data as T;
  }

  /**
   * Guarda un valor en el caché con tiempo de expiración
   */
  set<T>(key: string, data: T, expiresIn: number = 5 * 60 * 1000): void {
    // Si el caché está lleno, eliminar la entrada menos usada recientemente (LRU)
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn,
      accessCount: 1,
      lastAccess: Date.now()
    });
  }

  /**
   * Elimina la entrada menos usada recientemente (LRU eviction)
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Elimina una entrada del caché
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Elimina todas las entradas que coincidan con un patrón
   */
  deleteByPattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Limpia todo el caché
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Limpia entradas expiradas (útil para mantenimiento)
   */
  cleanExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.expiresIn) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Inicia el intervalo de limpieza automática
   */
  private startCleanupInterval(): void {
    // Limpiar entradas expiradas cada 2 minutos (más frecuente)
    if (typeof window !== 'undefined' || typeof global !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanExpired();
      }, 2 * 60 * 1000) as any;
    }
  }

  /**
   * Detiene el intervalo de limpieza
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Obtiene estadísticas del caché
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
}

// Instancia global del caché con límite de 150 entradas (aumentado para mejor rendimiento)
export const cache = new SimpleCache(150);
