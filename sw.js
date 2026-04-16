/* Ghost Syndicate Tools — Service Worker */
const CACHE   = 'gst-v3';
const STATIC  = [
  '/assets/ghostlogo.png',
];

// Assets que NUNCA cambian entre visitas (imágenes, fuentes externas)
const CACHE_FIRST = /\.(png|jpg|jpeg|gif|webp|svg|woff2?|ttf)$/i;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  // Borra todas las cachés antiguas
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // Imágenes y fuentes → cache-first (raramente cambian)
  if (CACHE_FIRST.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // HTML, JS, CSS, JSON → network-first
  // Siempre intenta la red; si falla (offline) usa caché
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request)
        .then(cached => cached || (
          e.request.mode === 'navigate' ? caches.match('/index.html') : undefined
        ))
      )
  );
});
