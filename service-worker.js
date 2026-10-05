const CACHE_NAME = 'cosmic-showroom-v1';
const CACHEABLE_EXTERNAL_ORIGINS = new Set([
  'https://cdn.jsdelivr.net',
  'https://dl.polyhaven.org'
]);

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter(cacheName => cacheName.startsWith('cosmic-showroom-') && cacheName !== CACHE_NAME)
      .map(cacheName => caches.delete(cacheName)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin && !CACHEABLE_EXTERNAL_ORIGINS.has(requestUrl.origin)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    if (request.mode === 'navigate') {
      try {
        const response = await fetch(request);
        if (response.ok) {
          event.waitUntil(cache.put(request, response.clone()).catch(error => {
            console.warn('Could not cache the showroom page:', error);
          }));
        }
        return response;
      } catch (error) {
        const cachedPage = await cache.match(request);
        if (cachedPage) return cachedPage;
        throw error;
      }
    }

    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;

    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque') {
      event.waitUntil(cache.put(request, response.clone()).catch(error => {
        console.warn(`Could not cache showroom resource ${request.url}:`, error);
      }));
    }
    return response;
  })());
});
