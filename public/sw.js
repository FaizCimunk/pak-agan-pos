const CACHE_NAME = 'pak-agan-pos-shell-v1';
const APP_SHELL_ROUTES = [
  '/',
  '/pos',
  '/karyawan',
  '/admin',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        APP_SHELL_ROUTES.map(async (route) => {
          try {
            const res = await fetch(route, { cache: 'reload' });
            if (res && res.ok) {
              await cache.put(route, res.clone());
            }
          } catch {
            // Abaikan jika pre-cache rute tertentu gagal saat instalasi offline
          }
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Selalu lewati request lintas origin (Supabase REST/Realtime, Cloudinary, dll.)
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigasi halaman: Network-First agar update deploy langsung masuk, fallback ke cache saat offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return (await caches.match('/pos')) || (await caches.match('/')) || Response.error();
        })
    );
    return;
  }

  // Aset statis Next.js (_next/static, ikon, manifest): Cache-First
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/favicon.ico'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
  }
});
