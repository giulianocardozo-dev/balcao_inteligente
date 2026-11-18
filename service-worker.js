const CACHE_NAME = 'balcao-inteligente-v3';
const ASSETS_TO_CACHE = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(ASSETS_TO_CACHE.map((url) => cache.add(url).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).origin !== self.location.origin) return; // fontes do Google etc. passam direto
  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        if (resp.ok) { const copia = resp.clone(); caches.open(CACHE_NAME).then((c) => c.put(event.request, copia)); }
        return resp;
      })
      .catch(() =>
        caches.match(event.request).then((r) =>
          r || (event.request.mode === 'navigate' ? caches.match('/index.html') : Response.error())
        )
      )
  );
});
