const CACHE = 'jit-v1';
const STATIC = ['/', '/index.html', '/manifest.webmanifest'];
const API_CACHE = 'jit-api-v1';
const API_CACHE_MAX_AGE = 5 * 60 * 1000; // 5 min

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE && k !== API_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API responses: cache-first with TTL
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          const date = cached.headers.get('x-sw-cached-at');
          if (date && Date.now() - parseInt(date) < API_CACHE_MAX_AGE) {
            return cached;
          }
        }
        try {
          const response = await fetch(request);
          if (response.ok) {
            const clone = response.clone();
            clone.headers.set('x-sw-cached-at', String(Date.now()));
            cache.put(request, clone);
          }
          return response;
        } catch {
          return cached || new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })
    );
    return;
  }

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
