self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open('wt-app-v1');
      await cache.addAll(['/', '/index.html', '/offline.html']);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== 'wt-app-v1' && k !== 'wt-api-v1' && k !== 'wt-assets-v1').map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

const API_PREFIXES = [
  '/auth',
  '/employees',
  '/products',
  '/transactions',
  '/purchases',
  '/suppliers',
  '/intermediaries',
  '/config',
  '/roles',
  '/expenses',
];

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isApiPath(pathname) {
  return API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (!isSameOrigin(url)) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const cached = await caches.match('/index.html');
          return cached || (await caches.match('/offline.html')) || new Response('offline', { status: 503 });
        }
      })()
    );
    return;
  }

  if (req.method !== 'GET') return;

  if (isApiPath(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open('wt-api-v1');
        try {
          const res = await fetch(req);
          if (res && res.ok) {
            cache.put(req, res.clone());
          }
          return res;
        } catch {
          const cached = await cache.match(req);
          return cached || new Response(JSON.stringify({ detail: 'Backend no disponible' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
        }
      })()
    );
    return;
  }

  const dest = req.destination;
  if (dest === 'script' || dest === 'style' || dest === 'image' || dest === 'font') {
    event.respondWith(
      (async () => {
        const cache = await caches.open('wt-assets-v1');
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      })()
    );
  }
});

