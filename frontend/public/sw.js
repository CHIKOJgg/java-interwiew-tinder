const CACHE = 'jit-v3';
const STATIC = ['/manifest.webmanifest', '/icon.svg'];

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

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API responses: pass through without SW interception
  // The API client already has retry logic and error handling.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Navigation & HTML: always Network-First with offline fallback to cached shell
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then((c) => c.put('/index.html', clone));
          }
          return resp;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Assets & other static resources: Cache-First with validation
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((resp) => {
        if (resp.ok) {
          const contentType = resp.headers.get('content-type') || '';
          // If a requested JS/CSS asset returns HTML, host SPA rewrite returned index.html for a missing chunk
          if (request.url.includes('/assets/') && contentType.includes('text/html')) {
            return new Response('Asset not found', { status: 404, statusText: 'Not Found' });
          }

          if (request.url.includes('/assets/') || STATIC.includes(url.pathname)) {
            const clone = resp.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
        }
        return resp;
      });
    })
  );
});
