// ============================================================
// HASSIBA Suite ERP - In-Memory Cache Utility
// Simple in-memory cache with TTL (for production, use Redis)
// ============================================================

export interface CacheEntry<T = any> {
  data: T;
  expiry: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry>()
  
  /**
   * Get a value from cache by key
   * Returns null if not found or expired
   */
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key)
    if (!item) return null
    
    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return item.data as T
  }
  
  /**
   * Set a value in cache with TTL in seconds (default: 5 minutes)
   */
  async set(key: string, data: any, ttlSeconds: number = 300): Promise<void> {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000
    })
  }
  
  /**
   * Invalidate a specific cache key
   */
  invalidate(key: string): void {
    this.cache.delete(key)
  }
  
  /**
   * Invalidate all keys matching a pattern (regex)
   * Use with caution - iterates all keys
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern)
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }
  
  /**
   * Clear all cached items
   */
  clear(): void {
    this.cache.clear()
  }
  
  /**
   * Get current cache size (number of entries)
   */
  size(): number {
    return this.cache.size
  }
  
  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }
  
  /**
   * Clean up all expired entries
   * Call periodically to free memory
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
      }
    }
  }
}

// Export singleton instance
export const cache = new MemoryCache()

// Auto-cleanup every 5 minutes
if (typeof globalThis !== 'undefined') {
  setInterval(() => cache.cleanup(), 5 * 60 * 1000)
}

// ============================================================
// Cache Key Generators - Consistent key generation for different resources
// ============================================================

export const CacheKeys = {
  // Dashboard cache key (per company)
  dashboard(companyId?: string): string {
    return `dashboard:${companyId || 'default'}`
  },
  
  // Invoice list cache key (with filters)
  invoices(params: { 
    status?: string; 
    type?: string; 
    page?: number; 
    limit?: number;
    companyId?: string 
  }): string {
    return `invoices:${JSON.stringify(params)}`
  },
  
  // Single invoice cache key
  invoice(id: string): string {
    return `invoice:${id}`
  },
  
  // Product catalog cache key (with filters)
  products(params: { 
    search?: string; 
    category?: string; 
    page?: number; 
    limit?: number;
    companyId?: string 
  }): string {
    return `products:${JSON.stringify(params)}`
  },
  
  // Single product cache key
  product(id: string): string {
    return `product:${id}`
  },
  
  // Partner list cache key
  partners(params: { 
    type?: string; 
    page?: number; 
    limit?: number;
    companyId?: string 
  }): string {
    return `partners:${JSON.stringify(params)}`
  }
}
