/**
 * High-Performance In-Memory Cache Service
 * 
 * Provides tagged cache invalidation for Menu, Categories, Settings, and Analytics snapshots.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  tags: string[];
}

class CacheService {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttlSeconds: number = 300, tags: string[] = []): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
      tags
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a tag (e.g. 'menu', 'settings')
   */
  invalidateTag(tag: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const cacheService = new CacheService();
