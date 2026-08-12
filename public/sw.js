// HASSIBA Suite ERP - Service Worker
// Version: 2.0.0
// PWA Support with Offline Capabilities

const CACHE_VERSION = 'v2.0.0';
const STATIC_CACHE = `hassiba-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `hassiba-dynamic-${CACHE_VERSION}`;
const API_CACHE = `hassiba-api-${CACHE_VERSION}`;
const FORMS_CACHE = `hassiba-forms-${CACHE_VERSION}`;

// Cache configuration
const CONFIG = {
  staticAssets: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    patterns: [
      '/',
      '/login',
      '/offline',
      '/manifest.json',
      '/icons/icon-192x192.png',
      '/icons/icon-512x512.png',
      '/favicon.ico',
      '/logo.svg'
    ]
  },
  apiCache: {
    maxAge: 5 * 60, // 5 minutes
    maxSize: 50 // Max cached responses
  },
  dynamicCache: {
    maxSize: 100 // Max pages cached
  }
};

// Install event - Cache static assets
self.addEventListener('install', (event) => {
  console.log('[HASSIBA SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[HASSIBA SW] Pre-caching static assets');
        return cache.addAll(CONFIG.staticAssets.patterns).catch((err) => {
          console.warn('[HASSIBA SW] Some assets failed to pre-cache:', err);
          // Continue even if some assets fail
          return Promise.resolve();
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[HASSIBA SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('hassiba-') && !name.includes(CACHE_VERSION);
            })
            .map((name) => {
              console.log('[HASSIBA SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - Strategy routing
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests for caching (except for background sync)
  if (request.method !== 'GET') {
    // Handle POST/PUT for offline form submission
    if (request.method === 'POST' || request.method === 'PUT') {
      handleFormSubmission(event);
      return;
    }
    return;
  }

  // Skip chrome-extension and non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API calls - Network First with cache fallback
  if (isApiRequest(url)) {
    event.respondWith(networkFirstStrategy(request, API_CACHE, CONFIG.apiCache));
    return;
  }

  // Static assets - Cache First
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // Navigation requests - Network First with offline fallback
  if (isNavigationRequest(request)) {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE, CONFIG.dynamicCache)
      .catch(() => caches.match('/offline')));
    return;
  }

  // Default - Stale While Revalidate
  event.respondWith(staleWhileRevalidateStrategy(request, DYNAMIC_CACHE));
});

/**
 * Check if request is an API call
 */
function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

/**
 * Check if request is a static asset
 */
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext)) ||
         url.pathname.startsWith('/icons/') ||
         url.pathname.startsWith('/_next/static/');
}

/**
 * Check if request is a navigation request
 */
function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.destination === 'document');
}

/**
 * Cache First Strategy
 * Best for: Static assets that don't change often
 */
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    fetchAndCache(request, cacheName);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('[HASSIBA SW] Cache first failed:', error);
    throw error;
  }
}

/**
 * Network First Strategy
 * Best for: API calls and navigation that need fresh data
 */
async function networkFirstStrategy(request, cacheName, config = {}) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Clean up cache if needed
      if (config.maxSize) {
        await limitCacheSize(cacheName, config.maxSize);
      }
      
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[HASSIBA SW] Network failed, trying cache:', error);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error; // Will trigger offline fallback
  }
}

/**
 * Stale While Revalidate Strategy
 * Best for: Resources where speed matters but freshness is nice to have
 */
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const networkPromise = fetchAndCache(request, cacheName)
    .catch(err => console.warn('[HASSIBA SW] Revalidation failed:', err));
  
  return cachedResponse || networkPromise;
}

/**
 * Fetch and cache helper
 */
async function fetchAndCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    throw error;
  }
}

/**
 * Limit cache size by removing oldest entries
 */
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxSize) {
    const deleteCount = keys.length - maxSize;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
  }
}

/**
 * Handle form submissions when offline
 */
function handleFormSubmission(event) {
  event.respondWith(
    fetch(event.request).catch(async () => {
      // Store form data for later sync
      try {
        const formData = await event.request.clone().formData();
        const formsCache = await caches.open(FORMS_CACHE);
        
        const pendingForm = {
          url: event.request.url,
          method: event.request.method,
          body: Object.fromEntries(formData),
          timestamp: Date.now()
        };
        
        await formsCache.put(
          event.request,
          new Response(JSON.stringify(pendingForm), {
            headers: { 'Content-Type': 'application/json' }
          })
        );
        
        // Notify user about pending sync
        showNotification({
          title: 'HASSIBA ERP',
          body: 'Votre formulaire sera envoyé une fois la connexion rétablie.',
          icon: '/icons/icon-192x192.png',
          tag: 'pending-form'
        });
        
        return new Response(
          JSON.stringify({ success: true, status: 'pending_sync' }),
          { 
            status: 202,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      } catch (err) {
        console.error('[HASSIBA SW] Failed to store form:', err);
        return new Response(
          JSON.stringify({ success: false, error: 'Offline and storage failed' }),
          { 
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    })
  );
}

/**
 * Background Sync for pending forms
 */
self.addEventListener('sync', (event) => {
  console.log('[HASSIBA SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-pending-forms') {
    event.waitUntil(syncPendingForms());
  }
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncAppData());
  }
});

/**
 * Sync pending forms when back online
 */
async function syncPendingForms() {
  const cache = await caches.open(FORMS_CACHE);
  const keys = await cache.keys();
  
  for (const key of keys) {
    const response = await cache.match(key);
    const formData = await response.json();
    
    try {
      const syncResponse = await fetch(formData.url, {
        method: formData.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData.body)
      });
      
      if (syncResponse.ok) {
        await cache.delete(key);
        console.log('[HASSIBA SW] Form synced successfully:', formData.url);
        
        showNotification({
          title: 'HASSIBA ERP',
          body: 'Formulaire envoyé avec succès!',
          icon: '/icons/icon-192x192.png',
          tag: 'form-synced'
        });
      }
    } catch (err) {
      console.error('[HASSIBA SW] Failed to sync form:', err);
    }
  }
}

/**
 * Sync app data in background
 */
async function syncAppData() {
  // Trigger data synchronization with server
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_START' });
  });
  
  try {
    const response = await fetch('/api/sync', { method: 'POST' });
    if (response.ok) {
      clients.forEach(client => {
        client.postMessage({ type: 'SYNC_COMPLETE' });
      });
    }
  } catch (err) {
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_ERROR', error: err.message });
    });
  }
}

/**
 * Push Notification Support (Ready for future implementation)
 */
self.addEventListener('push', (event) => {
  console.log('[HASSIBA SW] Push received:', event);
  
  let data = {
    title: 'HASSIBA ERP',
    body: 'Vous avez une nouvelle notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: {}
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge || data.icon,
      vibrate: [200, 100, 200],
      data: data.data,
      actions: [
        { action: 'open', title: 'Ouvrir' },
        { action: 'dismiss', title: 'Fermer' }
      ],
      requireInteraction: false
    })
  );
});

/**
 * Handle notification click
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[HASSIBA SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        return self.clients.openWindow(targetUrl);
      })
  );
});

/**
 * Show notification helper
 */
function showNotification(options) {
  if ('Notification' in self && self.Notification.permission === 'granted') {
    self.registration.showNotification(options.title, options);
  }
}

/**
 * Message handler for communication with main thread
 */
self.addEventListener('message', (event) => {
  console.log('[HASSIBA SW] Message received:', event.data);
  
  switch (event.data?.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHES':
      event.waitUntil(clearAllCaches());
      break;
      
    case 'GET_CACHE_SIZE':
      getCacheSize().then(size => {
        event.source.postMessage({ type: 'CACHE_SIZE', size });
      });
      break;
      
    case 'TRIGGER_SYNC':
      event.waitUntil(syncPendingForms());
      break;
      
    default:
      break;
  }
});

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const names = await caches.keys();
  await Promise.all(names.map(name => caches.delete(name)));
  console.log('[HASSIBA SW] All caches cleared');
}

/**
 * Get total cache size info
 */
async function getCacheSize() {
  const names = await caches.keys();
  let totalSize = 0;
  const details = {};
  
  for (const name of names) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    let cacheSize = 0;
    
    for (const key of keys) {
      const response = await cache.match(key);
      if (response) {
        const blob = await response.clone().blob();
        cacheSize += blob.size;
      }
    }
    
    details[name] = { entries: keys.length, size: cacheSize };
    totalSize += cacheSize;
  }
  
  return { totalSize, details };
}

// Connection status monitoring
self.addEventListener('online', () => {
  console.log('[HASSIBA SW] Back online!');
  
  // Sync pending forms
  self.registration.sync.register('sync-pending-forms');
  
  // Notify all clients
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'ONLINE_STATUS_CHANGE', online: true });
    });
  });
});

self.addEventListener('offline', () => {
  console.log('[HASSIBA SW] Went offline');
  
  // Notify all clients
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'ONLINE_STATUS_CHANGE', online: false });
    });
  });
});

console.log('[HASSIBA SW] Service worker loaded - Version:', CACHE_VERSION);
