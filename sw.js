/* ═══════════════════════════════════════════════
   IMGPDF PRO — Service Worker
   Strategy:
   · App shell  → Cache-First  (instant load)
   · CDN libs   → Cache-First  (pre-cached on install)
   · Fonts      → Cache-First  (cached on first use)
   · Other      → Network-First w/ cache fallback
═══════════════════════════════════════════════ */

const VERSION     = 'v1.0.0';
const CACHE_SHELL = `imgpdf-shell-${VERSION}`;
const CACHE_CDN   = `imgpdf-cdn-${VERSION}`;
const CACHE_FONT  = `imgpdf-fonts-${VERSION}`;

/* ── App Shell: cached immediately on install ── */
const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/script.js',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32x32.png',
];

/* ── CDN libraries: pre-cached on install ── */
const CDN_LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pica/9.0.1/pica.min.js',
];

/* ── CDN & Font origins (for routing) ── */
const CDN_ORIGINS  = ['cdnjs.cloudflare.com'];
const FONT_ORIGINS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

/* ═══════════════════════════════════════════════
   INSTALL — pre-cache everything
═══════════════════════════════════════════════ */
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      // App shell
      caches.open(CACHE_SHELL).then(cache => {
        return Promise.allSettled(
          APP_SHELL.map(url =>
            cache.add(url).catch(() =>
              console.warn(`[SW] Shell miss: ${url}`)
            )
          )
        );
      }),
      // CDN libraries
      caches.open(CACHE_CDN).then(cache => {
        return Promise.allSettled(
          CDN_LIBS.map(url =>
            fetch(url, { mode: 'cors', credentials: 'omit' })
              .then(res => res.ok ? cache.put(url, res) : null)
              .catch(() => console.warn(`[SW] CDN miss: ${url}`))
          )
        );
      }),
    ])
    .then(() => {
      console.log(`[SW] Installed ${VERSION} — shell & CDN cached.`);
      return self.skipWaiting();
    })
  );
});

/* ═══════════════════════════════════════════════
   ACTIVATE — purge old caches
═══════════════════════════════════════════════ */
self.addEventListener('activate', event => {
  const CURRENT = new Set([CACHE_SHELL, CACHE_CDN, CACHE_FONT]);

  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => !CURRENT.has(k) && k.startsWith('imgpdf-'))
          .map(k => {
            console.log(`[SW] Purging old cache: ${k}`);
            return caches.delete(k);
          })
      ))
      .then(() => {
        console.log(`[SW] Activated ${VERSION}.`);
        return self.clients.claim();
      })
  );
});

/* ═══════════════════════════════════════════════
   FETCH — routing & response strategies
═══════════════════════════════════════════════ */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* Skip non-GET and browser-extension requests */
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  /* ── Fonts (googleapis / gstatic) → Cache-First ── */
  if (FONT_ORIGINS.some(o => url.hostname.includes(o))) {
    event.respondWith(cacheFirst(request, CACHE_FONT));
    return;
  }

  /* ── CDN Libraries → Cache-First ── */
  if (CDN_ORIGINS.some(o => url.hostname.includes(o))) {
    event.respondWith(cacheFirst(request, CACHE_CDN));
    return;
  }

  /* ── App Shell (same origin) → Cache-First ── */
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, CACHE_SHELL));
    return;
  }

  /* ── Everything else → Network-First w/ fallback ── */
  event.respondWith(networkFirst(request, CACHE_SHELL));
});

/* ═══════════════════════════════════════════════
   STRATEGIES
═══════════════════════════════════════════════ */

/**
 * Cache-First: serve from cache immediately; if missing,
 * fetch from network and store in cache.
 */
async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineFallback(request);
  }
}

/**
 * Network-First: try network first; on failure fall back to cache.
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

/**
 * Offline fallback: returns a minimal offline HTML page
 * for navigation requests; nothing for assets.
 */
function offlineFallback(request) {
  if (request.headers.get('Accept')?.includes('text/html')) {
    return caches.match('./index.html');
  }
  return new Response('', {
    status:  503,
    statusText: 'Offline',
    headers: { 'Content-Type': 'text/plain' },
  });
}

/* ═══════════════════════════════════════════════
   BACKGROUND SYNC — notify clients of updates
═══════════════════════════════════════════════ */
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: VERSION });
  }
});
