/**
 * Service Worker for Fortis Secured PWA
 * 
 * Features:
 * - Offline support with cache-first strategy
 * - Background sync for offline actions
 * - Push notifications support
 * - App shell caching
 * - Dynamic content caching
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `fortis-secured-${CACHE_VERSION}`;
const RUNTIME_CACHE = `fortis-runtime-${CACHE_VERSION}`;
const API_CACHE = `fortis-api-${CACHE_VERSION}`;

// Resources to cache on install (app shell)
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/v1\/databases/,
  /\/v1\/storage/,
];

// Cache duration (in seconds)
const CACHE_DURATION = {
  images: 7 * 24 * 60 * 60, // 7 days
  api: 5 * 60, // 5 minutes
  static: 30 * 24 * 60 * 60, // 30 days
};

/**
 * Install event - cache app shell
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(APP_SHELL);
    }).then(() => {
      console.log('[SW] Service worker installed');
      return self.skipWaiting(); // Activate immediately
    })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('fortis-') && cacheName !== CACHE_NAME && 
              cacheName !== RUNTIME_CACHE && cacheName !== API_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service worker activated');
      return self.clients.claim(); // Take control immediately
    })
  );
});

/**
 * Fetch event - network with cache fallback
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle different types of requests
  if (isAPIRequest(url)) {
    // API requests - network first, cache fallback
    event.respondWith(handleAPIRequest(request));
  } else if (isImageRequest(url)) {
    // Images - cache first, network fallback
    event.respondWith(handleImageRequest(request));
  } else if (isStaticAsset(url)) {
    // Static assets - cache first
    event.respondWith(handleStaticRequest(request));
  } else {
    // Navigation requests - network first, cache fallback
    event.respondWith(handleNavigationRequest(request));
  }
});

/**
 * Check if request is to API
 */
function isAPIRequest(url) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname)) ||
         url.hostname.includes('appwrite.io') ||
         url.pathname.startsWith('/api/');
}

/**
 * Check if request is for an image
 */
function isImageRequest(url) {
  return /\.(jpg|jpeg|png|gif|svg|webp|ico)$/i.test(url.pathname);
}

/**
 * Check if request is for static asset
 */
function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|eot)$/i.test(url.pathname) ||
         url.pathname.startsWith('/assets/');
}

/**
 * Handle API requests - network first, cache fallback with freshness check
 */
async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      
      // Add timestamp header for freshness check
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-at', Date.now().toString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers,
      });
      
      cache.put(request, cachedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    console.log('[SW] Network failed, trying cache for:', request.url);
    
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Check if cache is still fresh
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      if (cachedAt) {
        const age = (Date.now() - parseInt(cachedAt)) / 1000;
        if (age > CACHE_DURATION.api) {
          console.log('[SW] Cached response is stale');
        }
      }
      
      return cachedResponse;
    }
    
    // Return offline page or error response
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'You are offline and no cached data is available' 
      }),
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

/**
 * Handle image requests - cache first, network fallback
 */
async function handleImageRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Fetch from network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache for future use
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Return placeholder image
    console.log('[SW] Failed to load image, returning placeholder');
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#0B1220" width="200" height="200"/><text x="50%" y="50%" text-anchor="middle" fill="#fff">Offline</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

/**
 * Handle static asset requests - cache first
 */
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Fetch from network and cache
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch static asset:', request.url);
    throw error;
  }
}

/**
 * Handle navigation requests - network first, cache fallback
 */
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful HTML responses
    if (networkResponse.ok && networkResponse.headers.get('content-type')?.includes('text/html')) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Try cache
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return cached index.html for SPA routing
    const indexResponse = await cache.match('/index.html');
    if (indexResponse) {
      return indexResponse;
    }
    
    // Last resort - offline page
    return new Response(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - Fortis Secured</title>
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0B1220;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            text-align: center;
          }
          .container { max-width: 400px; padding: 2rem; }
          h1 { font-size: 2rem; margin-bottom: 1rem; }
          p { opacity: 0.7; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>You're Offline</h1>
          <p>It looks like you've lost your internet connection. Please check your connection and try again.</p>
        </div>
      </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag.startsWith('sync-')) {
    event.waitUntil(syncOfflineActions());
  }
});

/**
 * Sync offline actions when back online
 */
async function syncOfflineActions() {
  console.log('[SW] Syncing offline actions...');
  
  try {
    // Get offline actions from IndexedDB or localStorage
    const actions = await getOfflineActions();
    
    for (const action of actions) {
      try {
        // Replay the action
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body,
        });
        
        // Remove from queue on success
        await removeOfflineAction(action.id);
        
        // Notify user
        self.registration.showNotification('Sync Complete', {
          body: 'Your offline changes have been synchronized',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
        });
      } catch (error) {
        console.error('[SW] Failed to sync action:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

/**
 * Push notification handler
 */
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'New notification from Fortis Secured',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Fortis Secured', options)
  );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    const urlToOpen = event.notification.data.url || '/portal';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Focus existing window if available
          for (const client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Open new window
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

/**
 * Message handler for communication with app
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('fortis-')) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  }
});

// Placeholder functions for offline action queue (implement with IndexedDB)
async function getOfflineActions() {
  // TODO: Implement with IndexedDB
  return [];
}

async function removeOfflineAction(id) {
  // TODO: Implement with IndexedDB
  return true;
}
