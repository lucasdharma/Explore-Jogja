/* Service worker for the Our Yogyakarta guide.
   Strategy:
   - App shell (this page + icons + manifest): precached, served cache-first for
     instant repeat loads and basic offline access to the guide content.
   - Navigations: network-first so a fresh deploy always shows, falling back to
     the cached page when offline.
   - Google Fonts: stale-while-revalidate.
   - Map library + tiles (cross-origin, and useless offline anyway): not cached —
     they go straight to the network and fail gracefully via the in-page handler. */

const VERSION = 'v4';
const SHELL_CACHE = `oy-shell-${VERSION}`;
const FONT_CACHE = `oy-fonts-${VERSION}`;

/* Relative URLs resolve against the SW's own location (the site root), so this
   works whether the site is served from a domain root or a project subpath. */
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './assets/couple-dogs.png',
  './assets/dogs-running.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // Add individually so one missing asset can't fail the whole install.
    await Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k !== SHELL_CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Google Fonts: stale-while-revalidate.
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith((async () => {
      const cache = await caches.open(FONT_CACHE);
      const cached = await cache.match(req);
      const network = fetch(req).then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      return cached || (await network) || fetch(req);
    })());
    return;
  }

  // Only handle same-origin requests below; let everything else (map tiles,
  // jsdelivr, etc.) hit the network directly.
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, fall back to cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(req);
      } catch {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match(req)) || (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Other same-origin GETs (icons, manifest): cache-first, then network.
  event.respondWith((async () => {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      return cached || Response.error();
    }
  })());
});
