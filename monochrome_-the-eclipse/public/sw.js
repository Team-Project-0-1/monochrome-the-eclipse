const CACHE_NAME = 'monochrome-the-eclipse-v1';
const APP_SHELL_URLS = [
  './',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './mono.webp',
  './apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

const isSameOriginAppRequest = (request) => {
  const requestUrl = new URL(request.url);
  const scopeUrl = new URL(self.registration.scope);

  return (
    request.method === 'GET' &&
    requestUrl.origin === self.location.origin &&
    requestUrl.pathname.startsWith(scopeUrl.pathname)
  );
};

const fetchAndCache = async (request) => {
  const response = await fetch(request);

  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }

  return response;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (!isSameOriginAppRequest(request)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetchAndCache(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return cache.match(request) || cache.match('./');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkResponse = fetchAndCache(request).catch(() => cachedResponse);
      return cachedResponse || networkResponse;
    })
  );
});
