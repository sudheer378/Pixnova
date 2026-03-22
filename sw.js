/**
 * ═══════════════════════════════════════════════════════════════════
 *  Pixaroid Service Worker  ·  sw.js
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Caching strategy:
 *    App shell  → Cache-First  (HTML skeleton, CSS, core JS)
 *    Tool pages → Stale-While-Revalidate  (HTML pages)
 *    Assets     → Cache-First with 30-day TTL  (fonts, images, SVG)
 *    API/fetch  → Network-First  (any dynamic fetch)
 *    Workers    → Cache-First  (Web Worker JS files)
 * ═══════════════════════════════════════════════════════════════════
 */

const VERSION      = 'pixaroid-v3.1.0';
const SHELL_CACHE  = `${VERSION}-shell`;
const PAGES_CACHE  = `${VERSION}-pages`;
const ASSETS_CACHE = `${VERSION}-assets`;

/* ── App shell files (precached on install) ─────────────────── */
const SHELL_URLS = [
  '/',
  '/css/output.css',
  '/css/animations.css',
  '/js/app.js',
  '/js/engine.js',
  '/js/modules/internal-links.js',
  '/js/modules/performance.js',
  '/js/modules/seo-meta.js',
  '/js/modules/file-handler.js',
  '/js/modules/canvas-engine.js',
  '/js/modules/download-manager.js',
  '/js/modules/toast.js',
  '/workers/compress.worker.js',
  '/workers/convert.worker.js',
  '/workers/resize.worker.js',
  '/workers/filter.worker.js',
  '/workers/bulk.worker.js',
  '/workers/ai.worker.js',
  '/assets/svg/logo.svg',
  '/assets/svg/favicon.svg',
  '/assets/svg/ui-icons.svg',
  '/assets/svg/tool-icons.svg',
  '/manifest.json',
];

/* ── Install: precache app shell ────────────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: delete stale caches ─────────────────────────── */
self.addEventListener('activate', event => {
  const keep = new Set([SHELL_CACHE, PAGES_CACHE, ASSETS_CACHE]);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !keep.has(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch: route to appropriate strategy ───────────────────── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // App shell → Cache-First
  if (_isShell(path)) {
    event.respondWith(_cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Static assets (fonts, images, SVG) → Cache-First, 30d TTL
  if (_isAsset(path)) {
    event.respondWith(_cacheFirst(request, ASSETS_CACHE));
    return;
  }

  // Tool/category HTML pages → Stale-While-Revalidate
  if (_isToolPage(path) || _isCategoryPage(path)) {
    event.respondWith(_staleWhileRevalidate(request, PAGES_CACHE));
    return;
  }

  // Everything else → Network-First with cache fallback
  event.respondWith(_networkFirst(request, PAGES_CACHE));
});

/* ── Strategies ─────────────────────────────────────────────── */
async function _cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline — cached version unavailable.', { status: 503 });
  }
}

async function _staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || fetchPromise || new Response('Page unavailable offline.', { status: 503 });
}

async function _networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Network error.', { status: 503 });
  }
}

/* ── Route classifiers ──────────────────────────────────────── */
function _isShell(path) {
  return path === '/' ||
    path.endsWith('.css') ||
    (path.startsWith('/js/') && path.endsWith('.js') && !path.includes('/chunks/')) ||
    (path.startsWith('/workers/') && path.endsWith('.js')) ||
    path === '/manifest.json';
}

function _isAsset(path) {
  return path.startsWith('/assets/') ||
    path.endsWith('.svg') ||
    path.endsWith('.png') ||
    path.endsWith('.jpg') ||
    path.endsWith('.webp') ||
    path.endsWith('.woff2') ||
    path.endsWith('.woff');
}

function _isToolPage(path) {
  return path.startsWith('/tools/') && (path.endsWith('/') || path.endsWith('.html'));
}

function _isCategoryPage(path) {
  return /^\/(compress|convert|resize|editor|ai|social|utilities|bulk)\/?$/.test(path) ||
    /^\/tools\/[^/]+\/$/.test(path);
}

/* ── Background sync: offline action queue ──────────────────── */
self.addEventListener('sync', event => {
  if (event.tag === 'pxn-offline-queue') {
    // Placeholder for background sync of deferred operations
    event.waitUntil(Promise.resolve());
  }
});
