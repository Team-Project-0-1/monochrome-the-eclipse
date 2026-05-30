// 캐시는 두 종류로 분리한다:
//  - PRECACHE: 설치 시 미리 담는 앱 셸(고정 목록, 소량).
//  - RUNTIME : fetch 중 동적으로 채우는 런타임 캐시(해시 에셋 등). 무한 증가를 막기 위해
//              RUNTIME_MAX_ENTRIES로 상한을 두고 FIFO로 가지치기한다.
// CACHE_VERSION을 올리면 activate에서 옛 버전 캐시(이전 단일 v1 포함)가 일괄 삭제된다.
const CACHE_VERSION = 'v2';
const PRECACHE = `monochrome-precache-${CACHE_VERSION}`;
const RUNTIME = `monochrome-runtime-${CACHE_VERSION}`;
const RUNTIME_MAX_ENTRIES = 64;
const EXPECTED_CACHES = [PRECACHE, RUNTIME];

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
      .open(PRECACHE)
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
            .filter((cacheName) => !EXPECTED_CACHES.includes(cacheName))
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

// 가장 오래 전에 들어온 항목부터 삭제해 캐시 크기를 상한 이하로 유지한다.
// cache.keys()는 삽입 순서를 보존하므로 앞에서부터 지우면 FIFO 가지치기가 된다.
const trimCache = async (cacheName, maxEntries) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  for (let i = 0; i < keys.length - maxEntries; i += 1) {
    await cache.delete(keys[i]);
  }
};

const fetchAndCache = async (request) => {
  const response = await fetch(request);

  if (response && response.ok) {
    const cache = await caches.open(RUNTIME);
    await cache.put(request, response.clone());
    // put 이후에 가지치기(상한 초과분 제거). 응답 반환을 막지 않도록 await는 하되 가볍게.
    await trimCache(RUNTIME, RUNTIME_MAX_ENTRIES);
  }

  return response;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (!isSameOriginAppRequest(request)) {
    return;
  }

  // 내비게이션(HTML)은 네트워크 우선 — 새 배포의 최신 index.html을 받아 갱신.
  // 오프라인이면 런타임 캐시의 해당 문서, 없으면 앱 셸('./')로 폴백.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetchAndCache(request).catch(async () => {
        const runtime = await caches.open(RUNTIME);
        const precache = await caches.open(PRECACHE);
        return (
          (await runtime.match(request)) ||
          (await precache.match('./')) ||
          Response.error()
        );
      })
    );
    return;
  }

  // 그 외(해시된 JS/CSS/이미지 등)는 stale-while-revalidate:
  // 캐시가 있으면 즉시 반환하고 백그라운드로 갱신, 없으면 네트워크 결과를 사용.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkResponse = fetchAndCache(request).catch(() => cachedResponse);
      return cachedResponse || networkResponse;
    })
  );
});
