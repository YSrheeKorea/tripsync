const CACHE_NAME = 'tripsync-pwa-v3';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // API 요청(동기화, 환율, 지도 검색 등)은 캐시하지 않고 항상 네트워크 사용
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('api.github.com') ||
    url.hostname.includes('githubusercontent.com') ||
    url.hostname.includes('er-api.com') ||
    url.hostname.includes('open-meteo.com') ||
    url.hostname.includes('nominatim')
  ) {
    return;
  }

  // Network-first: 온라인일 때는 항상 최신 버전 사용, 오프라인(비행기/지하철)일 때는 캐시로 실행
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res && res.status === 200 && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
