// Minimal service worker for PWA install + offline static caching.
const CACHE = 'jit-v1';
const STATIC = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for navigation, cache-first for static assets.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) =>
      cached || fetch(request).then((resp) => {
        if (resp.ok && (request.url.includes('/assets/') || STATIC.includes(new URL(request.url).pathname))) {
          const clone = resp.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
        }
        return resp;
      }).catch(() => cached)
    )
  );
});
